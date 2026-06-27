// Canonical sync merge — imported by BOTH the client (src/store/sync.ts, via the
// co-located syncMerge.d.mts) and the server (server/server.mjs, run raw by node).
// Plain ESM JS with no dependencies so node can execute it directly.
//
// Model: last-write-wins by `updatedAt` (ISO string) with soft-delete tombstones
// (`deletedAt`). A soft-delete bumps `updatedAt`, so a delete@T2 naturally beats an
// edit@T1 — no special tombstone handling is needed in the merge itself.
//
// Two correctness properties the whole design leans on:
//   * Deterministic + commutative: mergeData(a,b) and mergeData(b,a) produce the
//     same canonical result, so two devices converge after one round-trip.
//   * Fixpoint: re-merging an already-merged doc against itself is a no-op, which
//     is what lets the client guard against the save -> adopt -> save loop.

const EPOCH = 0

// Parse an ISO timestamp to epoch millis. Anything missing/invalid coerces to 0
// (the epoch) so an un-timestamped record always LOSES to a real edit — fail safe.
function toMillis(ts) {
  if (typeof ts !== 'string') return EPOCH
  const t = Date.parse(ts)
  return Number.isFinite(t) ? t : EPOCH
}

// Deterministic serialization: object keys sorted recursively so two records with
// identical content always stringify identically regardless of key order. Used both
// for the equal-timestamp tie-break and for the client's change-detection guard.
export function canonicalJSON(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']'
  const keys = Object.keys(value).sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}'
}

// Pick the winner between two versions of the SAME record (same id) from two
// sources. Higher `updatedAt` wins. On an exact timestamp tie we break on the
// canonical serialization (larger string wins) — both devices compute the same
// string, so they pick the same winner and converge. Identical content -> a is
// returned, which keeps re-merges a fixpoint.
export function pickWinner(a, b) {
  if (!a) return b
  if (!b) return a
  const ta = toMillis(a.updatedAt)
  const tb = toMillis(b.updatedAt)
  if (ta > tb) return a
  if (tb > ta) return b
  const sa = canonicalJSON(a)
  const sb = canonicalJSON(b)
  if (sa === sb) return a
  return sa > sb ? a : b
}

function byIdAsc(x, y) {
  return x.id < y.id ? -1 : x.id > y.id ? 1 : 0
}

// Union two record lists by id, resolving collisions with pickWinner. Output is
// sorted by id so the result is fully order-independent (commutative incl. order),
// which the fixpoint guard relies on. Records without a string id are dropped.
export function mergeRecords(base, incoming) {
  const byId = new Map()
  for (const r of base ?? []) {
    if (r && typeof r.id === 'string') byId.set(r.id, r)
  }
  for (const r of incoming ?? []) {
    if (!r || typeof r.id !== 'string') continue
    const existing = byId.get(r.id)
    byId.set(r.id, existing ? pickWinner(existing, r) : r)
  }
  return [...byId.values()].sort(byIdAsc)
}

// Merge two versions of the same trip. Scalars (name, departureDate, profile,
// activeKitIds, deletedAt) follow the Trip.updatedAt winner; `completedAt` is
// MONOTONIC (a non-null completion is never lost to an older edit); `items` merge
// per-item via mergeRecords so a check-off on one device survives an edit on the
// other.
function mergeTwoTrips(a, b) {
  const winner = pickWinner(a, b)
  const loser = winner === a ? b : a
  return {
    ...winner,
    completedAt: winner.completedAt ?? loser.completedAt ?? null,
    items: mergeRecords(a.items ?? [], b.items ?? []),
  }
}

export function mergeTrips(base, incoming) {
  const byId = new Map()
  for (const t of base ?? []) {
    if (t && typeof t.id === 'string') byId.set(t.id, t)
  }
  for (const t of incoming ?? []) {
    if (!t || typeof t.id !== 'string') continue
    const existing = byId.get(t.id)
    byId.set(t.id, existing ? mergeTwoTrips(existing, t) : t)
  }
  // Normalize EVERY surviving trip's items (sort + dedup by id), not just the
  // ones that collided — so a single-sided trip canonicalizes identically to a
  // merged one. This makes the trip-item path a true fixpoint (no spurious
  // reconciling save). mergeRecords is idempotent, so re-sorting a collision
  // trip's already-sorted items is a no-op.
  return [...byId.values()]
    .map(t => ({ ...t, items: mergeRecords(t.items ?? [], []) }))
    .sort(byIdAsc)
}

// Merge two whole data documents. `settings` is intentionally NOT merged here —
// it is device-local and handled by the client.
export function mergeData(base, incoming) {
  base = base ?? {}
  incoming = incoming ?? {}
  return {
    masterItems: mergeRecords(base.masterItems ?? [], incoming.masterItems ?? []),
    kits: mergeRecords(base.kits ?? [], incoming.kits ?? []),
    trips: mergeTrips(base.trips ?? [], incoming.trips ?? []),
  }
}

// Filter out tombstones — what the UI should render. Nested trip items are also
// filtered (so a soft-deleted item disappears but still propagates as a tombstone).
export function liveOnly(records) {
  return (records ?? []).filter(r => r && r.deletedAt == null)
}
