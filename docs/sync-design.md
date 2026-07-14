# Pack sync design & decision log

This is the *why* behind Pack's cross-device sync. `operations.md` is the runbook
(how to deploy/operate); this file is the design rationale and the record of the
decisions we made (and rejected), so that if sync misbehaves later we can trace
our reasoning instead of re-deriving it.

Status: **Phase 1 implemented** on branch `phase1-sync` (2026-06). Phase 2 (a real
iPhone app via Capacitor) is designed but not built.

---

## 1. Problem history

Three waves of data loss, all the same root cause — the sync had no notion of
*which copy is newer*:

1. **Trip data vanished.** A `visibilitychange` auto-pull pulled (sometimes empty)
   server state over local on every tab switch. → removed earlier.
2. **Library duplicated** ("Razor" ×2, ×3…). Seeds got `uuid()` ids at module load,
   so a storage wipe ("clear browsing data") reseeded with NEW ids and the union
   merge treated them as different records.
3. **Check-offs / completion didn't save** (the "completed Montana, nothing ticked"
   bug). Trips merged *server-always-wins* by id (`mergeById`) and every save was a
   blind full-overwrite `PUT` (`fs.writeFileSync(DATA_FILE, body)`). A stale open
   laptop tab silently reverted the phone's check-offs on its next save.

The user actively edits **the same trip on two devices in one sitting**, so the fix
has to merge at **per-item** granularity, not whole-trip.

---

## 2. Chosen architecture: server-merged LWW + tombstones

**Last-write-wins by `updatedAt` (ISO timestamp), with soft-delete tombstones
(`deletedAt`), merged on the SERVER.**

- Every synced record (`MasterItem`, `Kit`, `Trip`, `TripItem`) carries
  `updatedAt: string` and `deletedAt: string | null` (both required — see §6).
- The **server** does read → `mergeData(stored, incoming)` → atomic write, and
  returns the merged doc. The blind overwrite is gone, so a stale client can no
  longer clobber newer data — the worst it can do is re-assert its own older
  records, which simply lose the merge.
- The canonical merge lives in **`shared/syncMerge.mjs`**, imported by BOTH the
  client (`src/store/sync.ts`) and the server (`server/server.mjs`) so the two can
  never drift.

### Granularity (deliberate)
- `TripItem` merges **per-item** by `TripItem.updatedAt` — a check-off on one device
  survives an edit on the other. Item mutations bump **only** the item's
  `updatedAt`, never the parent `Trip.updatedAt`.
- Trip scalars (`name`, `departureDate`, `profile`, `activeKitIds`, deletion) merge
  by `Trip.updatedAt`.
- `completedAt` is **monotonic**: a non-null completion is never lost to an older
  edit (so "complete on phone" + "rename on laptop" keeps both).
- `Kit` merges **whole-record** by `Kit.updatedAt` (`KitItem` has no timestamps).
  Documented limit: two devices editing the *same* kit concurrently → last save of
  that kit wins (rare; kits change infrequently).

### Why server-side merge (not client-only)
A client-only merge still needs a blind PUT to persist, which re-opens the
clobber window between read and write. Merging on the server with a synchronous
read-merge-atomic-write closes that window: concurrent PUTs serialize and each
one merges against the latest committed state.

### Alternatives rejected
- **CRDT / Yjs / Automerge** — correct but heavy for a single-user packing list;
  large dep, opaque state, overkill.
- **Per-field vector clocks** — more precise conflict handling than LWW, but the
  data is low-contention and human-scale; LWW with the monotonic-completedAt
  carve-out covers the real cases at a fraction of the complexity.
- **"Server always wins" / "client always wins"** — both lose real edits; this is
  exactly what caused the three data-loss waves.

---

## 3. Correctness properties the design leans on

`mergeData` is **deterministic, commutative, and idempotent**:

- **Commutative** — `mergeData(a,b)` canonically equals `mergeData(b,a)`, so two
  devices converge after one round-trip regardless of who syncs first. Achieved by:
  higher `updatedAt` wins; on an exact tie, the **larger canonical serialization**
  wins (both devices compute the same string → same choice); output arrays are
  **sorted by id** so even ordering is argument-independent.
- **Fixpoint** — re-merging an already-merged doc is a no-op. This is what lets the
  client guard against an infinite save→adopt→save loop.
- **Fail-safe timestamps** — a missing/invalid `updatedAt` coerces to epoch (0), so
  an un-timestamped record always *loses* to a real edit.

Tombstones need no special merge logic: a soft-delete bumps `updatedAt`, so a
delete@T2 naturally beats an edit@T1.

---

## 4. Red-team findings and how each is addressed

The design was red-teamed through three lenses (convergence, mobile/offline,
security/rollout). Each finding and its fix:

| # | Risk | Fix |
|---|------|-----|
| 1 | Switching seeds to deterministic ids orphans trip/kit FKs that referenced the old random ids | Persist migration v2 + the server normalize script both **remap** `TripItem.masterItemId`, `KitItem.masterItemId`, `KitItem.swapsItemId` through an old→new id map (`migrateV1toV2`, `scripts/normalize-server-data.mjs`) |
| 2 | Hard deletes resurrect after a merge (server re-adds the record) | All **active-record** deletes (`deleteTrip`, `deleteKit`, `removeTripItem`) are now **soft-deletes** (tombstones); UI renders only `deletedAt == null` |
| 3 | Concurrent trip-scalar edits lose one side | Trip scalars merge by `Trip.updatedAt`; `completedAt` is monotonic so completion is never lost |
| 4 | Equal-timestamp tie causes oscillation between two devices | Deterministic tie-break on canonical serialization; identical content is a fixpoint |
| 5 | Malformed payload corrupts `data.json` | Server **validates shape** (arrays; string `id`; parseable ISO `updatedAt`) → 400, no write |
| 6 | One bad device clock poisons LWW with a far-future timestamp | Server **rejects** any record with `updatedAt > now + 60s` → 400 |
| 7 | Non-atomic write tears `data.json` under concurrent PUTs | Synchronous read→merge→**temp-file + `renameSync`**, no `await` between read and write |
| 8 | Client save↔adopt loop / two-device ping-pong | **Remote-apply guard**: state applied from the server sets an `applyingRemote` flag so the subscriber skips the save; plus canonical-equality checks so we only setState/PUT when something actually changed |
| 9 | iOS Safari freezes background tabs / bfcache restores stale state | Flush on `visibilitychange:hidden` (+ keepalive on `pagehide`); pull on `visibilitychange:visible` **and** `pageshow` with `event.persisted` |
| 10 | A stale old-code tab re-corrupts data mid-rollout | **Schema version gate**: payloads carry `schemaVersion: 2`; the server rejects missing/older with **426** before touching the file, and the client halts syncing on 426 ("App update needed — reload") |

---

## 5. Secrets

- The **sync token was committed in plaintext** in `operations.md` — scrubbed
  (replaced with a placeholder) as part of this work; rotate it on the server
  (see §9).
- The **OpenRouter API key is no longer synced.** Previously it rode along in
  `settings` to every device. The client now sends **data only** (`masterItems`,
  `kits`, `trips` + `schemaVersion`); the server persists only those keys, so
  `data.json` can never contain a secret. The key is entered once per device.

---

## 6. Implementation map (where each piece lives)

| Concern | File |
|---|---|
| Record types (`updatedAt`/`deletedAt` required; `SCHEMA_VERSION`) | `src/types/index.ts`, `src/constants.ts` |
| Canonical merge (client + server) | `shared/syncMerge.mjs` (+ `.d.mts`) |
| Deterministic seed ids (single source of truth) | `shared/seedIds.mjs` (+ `.d.mts`), consumed by `src/store/seed.ts` |
| Server: 426 gate, validation, far-future reject, atomic merge-write | `server/server.mjs` |
| Mutations: timestamp granularity + soft-delete | `src/store/index.ts` |
| Client sync flow: guard, LWW load/save, 426, lifecycle | `src/store/sync.ts` |
| Persist migration v1→v2 + FK remap | `migrateV1toV2` in `src/store/index.ts` |
| One-time server normalization | `scripts/normalize-server-data.mjs` |
| Easier connect (link + QR + `#token=`) | `src/components/manage/ApiSettings.tsx`, `src/App.tsx` |

`updatedAt`/`deletedAt` are **required** (not optional) on the record types
deliberately: `tsc -b` then enumerates every construction site that forgets them,
turning the compiler into the worklist for wiring the mutations.

Tests: `tests/syncMerge.test.ts` (merge convergence/idempotence/the Montana bug),
`tests/seed.test.ts` (seed/seedIds drift guard), `tests/store/migration.test.ts`
(re-key + FK remap + dedup), `tests/store/mutations.test.ts` (granularity +
tombstones), `tests/store/sync.test.ts` (LWW load, ping-pong guard, secret-strip,
426 halt).

---

## 7. Rollout order (as executed 2026-06-27 — do NOT reorder)

1. `npm test` + `npm run build` green locally.
2. **Back up `data.json`** on the server (`cp` to `data.json.pre-phase1-bak`, plus a
   local pull). Deploy `server/server.mjs` + `shared/syncMerge.mjs` to
   `/opt/pack-sync/{server,shared}/`; update the systemd unit (`ExecStart` →
   `server/server.mjs`, add `PACK_DATA_FILE`); restart `pack-sync`. The 426 gate is
   now live → old tabs can't write.
3. **Normalize the server data by REPLACING `data.json` directly — NOT via the
   script's PUT.** ⚠️ The new server *merges* every PUT (`mergeData(current,
   incoming)`, union by id). PUTting normalized (new deterministic-id) seeds while
   the file still holds old random-id seeds would UNION them → 96 duplicated items.
   So: GET current data → run it through `normalize()` (from
   `scripts/normalize-server-data.mjs`, which exports the pure function) → write the
   result straight to `/opt/pack-sync/data.json` (stop service → atomic `mv` →
   start). The script's PUT path is only safe to re-run once the server is *already*
   normalized (then it's an idempotent no-op, ids match). A future fix would add a
   `--write-file`/direct-replace mode to the script; until then, normalization of
   un-normalized data is a direct file write.
4. Deploy the new client build to `/var/www/pack/` (`scp -r dist/*`).
5. Each device's next load: persist migration v1→v2 → LWW merge → converges, no dups.
6. **Rotate the token → passphrase last** (after live verification, so the
   verification could use the existing token). Old token now returns 401; each
   device re-enters the passphrase once (or scans the connect-link QR). Done
   2026-06-27 — passphrase set in `PACK_SYNC_TOKEN`; the old token (exposed in git
   history) is dead.

---

## 8. Residual limitations (accepted, documented)

- **Edit-after-delete resurrects** the record's last edit if it post-dates the
  tombstone — last action wins. Acceptable for a single user.
- **Permanent delete / empty trash** for master items remain *local* hard purges;
  a purged item can reappear in Trash after a sync until tombstone **GC** exists
  (deferred). Active-record deletes are unaffected (they tombstone correctly).
- **Same-kit concurrent edits** → last save of that kit wins (whole-record merge).
- **No live cross-tab push on one device** — propagation is pull-on-foreground +
  debounced save, not a websocket. Sub-second NTP skew is accepted.
- Record arrays become **id-sorted** after any merge (the UI groups by category,
  so this is cosmetic).
- **A persistently-failing save is now surfaced but not auto-persisted.** As of
  2026-07-14 the client reports sync failures (toast + status line in `ApiSettings`,
  via `src/store/syncStatusStore.ts`) instead of swallowing them. Transient failures
  (network/500) self-heal on the next foreground pull; *persistent* ones do not — a
  bad device clock trips the server's far-future guard, which rejects the **whole**
  payload (400), and the re-pushed payload just re-rejects. The user is now told, but
  must fix the cause (clock/passphrase). Dropping/clamping the single offending record
  instead of 400-ing everything is the follow-up if this ever bites.
- **`isPacked` merges by whole-record LWW with no monotonic carve-out** (unlike
  `Trip.completedAt`). A genuinely-newer edit on an *unpacked* copy of an item can
  overwrite a *packed* copy on another device — the only remaining path that can zero
  a check-off. Not observed in practice (the 2026-07 investigation confirmed the
  reported loss was pre-rework, never-synced data, not this). Fix if it recurs:
  make `isPacked` monotonic, accepting that cross-device *un*-checking would then lose.

---

## 9. Easier connect (passphrase + transfer)

The token is an opaque bearer string; "easier to input" is delivered two ways:
- **Connect link + QR** (`ApiSettings`): a connected device shows
  `…/#token=<token>` as a copyable link and an on-device QR (token never leaves
  the device). A new device opens the link → auto-fills, connects, and scrubs the
  token from the URL.
- **Passphrase**: the server token may be set to a memorable multi-word passphrase
  (chosen by the user, set in `PACK_SYNC_TOKEN`). Rate-limiting was **deferred**;
  a ≥5-word passphrase has enough entropy to resist online guessing on its own.
  There is no sensitive data behind it (worst-case leak is a packing list), so a
  passphrase is an acceptable trade for memorability.

---

## 10. Phase 2 — iPhone app via Capacitor (designed, NOT built)

Reuses 100% of the React UI. Required changes when we build it:
- `BrowserRouter` → `HashRouter`; Vite `base: './'`.
- Register the service worker only on an `https:` origin (not `capacitor://`).
- Fix the OpenRouter `HTTP-Referer` (currently `window.location.origin`, which is
  `capacitor://` in the wrapper).
- If persistence moves to async `@capacitor/preferences`, gate `startSync()` on
  hydration (boot race).
- `@capacitor/core` + CLI → `cap init` / `add ios` / `sync` → Xcode → TestFlight
  (needs an Apple Developer account).

**Rationale:** the deepest root cause of the duplication bug was Safari evicting
localStorage. Native durable storage that the OS won't evict attacks that root
cause directly — which is why Capacitor is the chosen path over staying a pure PWA.

---

## 11. Deferred hardening (recorded so it isn't lost)

Lower stakes for a single-user, obscure-URL app; revisit after Phase 1 proves out:
server request body-size cap, `crypto.timingSafeEqual` for the auth compare,
tombstone GC (~1yr), Caddy `rate_limit` + `Authorization` log exclusion,
`@capacitor/preferences` for durable native storage.

**Done since:** per-write rolling backups of `data.json` (2026-07-14) —
`server/persist.mjs` keeps the newest 50 timestamped `.bak.*` snapshots (best-effort;
no-op writes skipped so pull-triggered PUTs don't churn the window). Paired with
client-side sync-failure surfacing (`src/store/syncStatusStore.ts`) so a silent
never-syncing state can't recur unnoticed.
