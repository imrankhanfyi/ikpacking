// scripts/normalize-server-data.mjs
//
// One-time (idempotent) migration script: fetches the sync server's data.json,
// canonicalizes it to the deterministic-id + LWW/tombstone shape (schemaVersion 2),
// and PUTs it back.
//
// ⚠️ CAUTION — the PUT path is only safe against an ALREADY-normalized server.
// The server MERGES every PUT (union by id). PUTting new deterministic-id seeds
// while the file still holds OLD random-id seeds would UNION them → duplicates.
// For the FIRST normalization of un-normalized data, do a DIRECT FILE REPLACE
// instead: GET → `normalize()` (exported below) → write the result straight to
// /opt/pack-sync/data.json (stop service → atomic mv → start). See
// docs/sync-design.md §7 step 3. Once normalized, re-running the PUT is an
// idempotent no-op (ids already match).
//
// IDEMPOTENCY: Running this script twice is safe and produces the same result:
//   - Seed ids are deterministic (seedItemId/seedKitId derive from the item name),
//     so re-running re-computes the same ids.
//   - `updatedAt` uses `?? existing`, so an already-stamped record keeps its timestamp.
//   - `mergeRecords` deduplicates any duplicate seed entries by id.
//
// WHEN TO RUN: Once after deploying the new server (schemaVersion 2), BEFORE any
// clients sync. After that, the client-side migrateV1toV2 will canonicalize
// any remaining stale local data on first open.
//
// Usage:
//   PACK_SYNC_TOKEN=<token> node scripts/normalize-server-data.mjs [--dry-run]
//   node scripts/normalize-server-data.mjs <token> [--dry-run]
//   DRY_RUN=1 PACK_SYNC_TOKEN=<token> node scripts/normalize-server-data.mjs

import { seedItemId, seedKitId, SEED_ITEM_NAMES, SEED_KIT_NAMES, SEED_EPOCH } from '../shared/seedIds.mjs'
import { mergeRecords } from '../shared/syncMerge.mjs'

const DEFAULT_SYNC_URL = 'https://pack.imrankhan.fyi'

// ---------------------------------------------------------------------------
// Canonicalization — mirrors migrateV1toV2 in src/store/index.ts EXACTLY.
// Returns only { masterItems, kits, trips } — never includes `settings`.
// ---------------------------------------------------------------------------
export function normalize(persisted) {
  if (!persisted || typeof persisted !== 'object') return { masterItems: [], kits: [], trips: [] }
  const now = new Date().toISOString()

  // Master items: re-key seeds by name; user items keep their id.
  const masterIdMap = new Map()
  const rawMasters = (persisted.masterItems ?? []).map(it => {
    const isSeed = SEED_ITEM_NAMES.includes(it.name)
    const newId = isSeed ? seedItemId(it.name) : it.id
    if (typeof it.id === 'string' && newId !== it.id) masterIdMap.set(it.id, newId)
    return { ...it, id: newId, updatedAt: it.updatedAt ?? (isSeed ? SEED_EPOCH : now), deletedAt: it.deletedAt ?? null }
  })
  const remapMaster = id => id == null ? id : (masterIdMap.get(id) ?? id)

  const rawKits = (persisted.kits ?? []).map(k => {
    const isSeed = SEED_KIT_NAMES.includes(k.name)
    return {
      ...k,
      id: isSeed ? seedKitId(k.name) : k.id,
      items: (k.items ?? []).map(ki => ({
        ...ki,
        masterItemId: remapMaster(ki.masterItemId),
        ...(ki.swapsItemId == null ? {} : { swapsItemId: remapMaster(ki.swapsItemId) }),
      })),
      updatedAt: k.updatedAt ?? (isSeed ? SEED_EPOCH : now),
      deletedAt: k.deletedAt ?? null,
    }
  })

  const trips = (persisted.trips ?? []).map(t => ({
    ...t,
    completedAt: t.completedAt ?? null,
    updatedAt: t.updatedAt ?? t.createdAt ?? now,
    deletedAt: t.deletedAt ?? null,
    items: mergeRecords((t.items ?? []).map(ti => ({
      ...ti,
      masterItemId: remapMaster(ti.masterItemId),
      updatedAt: ti.updatedAt ?? t.createdAt ?? now,
      deletedAt: ti.deletedAt ?? null,
    })), []),
  }))

  return { masterItems: mergeRecords(rawMasters, []), kits: mergeRecords(rawKits, []), trips }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === '1'

  // Token: env var takes priority, then first non-flag CLI arg.
  const token = process.env.PACK_SYNC_TOKEN ?? args.find(a => !a.startsWith('-'))

  if (!token) {
    console.error('Error: no sync token provided.')
    console.error('')
    console.error('Usage:')
    console.error('  PACK_SYNC_TOKEN=<token> node scripts/normalize-server-data.mjs [--dry-run]')
    console.error('  node scripts/normalize-server-data.mjs <token> [--dry-run]')
    console.error('  DRY_RUN=1 PACK_SYNC_TOKEN=<token> node scripts/normalize-server-data.mjs')
    process.exit(1)
  }

  const baseUrl = (process.env.SYNC_URL ?? DEFAULT_SYNC_URL).replace(/\/$/, '')

  console.log(`Sync URL : ${baseUrl}`)
  console.log(`Dry run  : ${dryRun}`)
  console.log('')

  // GET current data
  console.log(`GET ${baseUrl}/api/data …`)
  const getRes = await fetch(`${baseUrl}/api/data`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!getRes.ok) {
    console.error(`GET failed: ${getRes.status} ${getRes.statusText}`)
    process.exit(1)
  }
  const data = await getRes.json()

  // Before counts
  const beforeMasters = (data.masterItems ?? []).length
  const beforeKits = (data.kits ?? []).length
  const beforeTrips = (data.trips ?? []).length
  console.log('Before:')
  console.log(`  masterItems : ${beforeMasters}`)
  console.log(`  kits        : ${beforeKits}`)
  console.log(`  trips       : ${beforeTrips}`)
  console.log(`  schemaVersion: ${data.schemaVersion ?? '(none)'}`)
  console.log('')

  // Normalize (count remapped ids by instrumenting)
  // We re-implement the id-map counting here without touching normalize() purity.
  let remappedCount = 0
  for (const it of (data.masterItems ?? [])) {
    if (SEED_ITEM_NAMES.includes(it.name)) {
      const newId = seedItemId(it.name)
      if (typeof it.id === 'string' && newId !== it.id) remappedCount++
    }
  }

  const normalized = normalize(data)

  // After counts
  const afterMasters = normalized.masterItems.length
  const afterKits = normalized.kits.length
  const afterTrips = normalized.trips.length
  console.log('After normalization:')
  console.log(`  masterItems : ${afterMasters}`)
  console.log(`  kits        : ${afterKits}`)
  console.log(`  trips       : ${afterTrips}`)
  console.log(`  seed ids re-keyed: ${remappedCount}`)
  console.log('')

  if (dryRun) {
    console.log('Dry run — skipping PUT.')
    return
  }

  // PUT normalized data back
  const body = JSON.stringify({ schemaVersion: 2, ...normalized })
  console.log(`PUT ${baseUrl}/api/data …`)
  const putRes = await fetch(`${baseUrl}/api/data`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  })
  console.log(`PUT response: ${putRes.status} ${putRes.statusText}`)
  if (!putRes.ok) {
    const text = await putRes.text().catch(() => '')
    if (text) console.error('Response body:', text)
    process.exit(1)
  }
  console.log('Done.')
}

// Only run main() when this file is the direct entry point (not imported as a module).
// This lets test files import `normalize` without triggering the fetch/PUT logic.
const isMain = process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]
if (isMain) {
  main().catch(err => {
    console.error('Unexpected error:', err)
    process.exit(1)
  })
}
