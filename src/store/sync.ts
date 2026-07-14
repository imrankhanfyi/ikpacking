import { useStore } from './index'
import { SYNC_URL, SCHEMA_VERSION } from '../constants'
import { toastError } from './toastStore'
import { useSyncStatusStore, reportSyncSuccess, reportSyncError } from './syncStatusStore'
import { mergeData, canonicalJSON } from '../../shared/syncMerge.mjs'
import type { MasterItem, Kit, Trip } from '../types'

// --- Sync model ---------------------------------------------------------------
// Non-destructive last-write-wins. The client NEVER overwrites the server blindly:
// every save is a server-side merge (the server returns the merged doc), and every
// load merges the server doc into local state by `updatedAt` with tombstones. So a
// stale tab can no longer revert another device's edits — the worst it can do is
// re-assert its own older records, which simply lose the merge.
//
// Two guards keep two devices from ping-ponging forever:
//   * `applyingRemote` — state applied FROM the server never schedules a save.
//   * canonical-equality checks — we only setState / PUT when the merge actually
//     changes something, so an already-converged pair produces zero traffic.

let saveTimer: ReturnType<typeof setTimeout> | null = null
let applyingRemote = false
let subscribed = false
let listenersAttached = false
let stopped = false // set when the server reports our schema is too old (426)

interface SyncData {
  masterItems: MasterItem[]
  kits: Kit[]
  trips: Trip[]
}

function getSyncConfig() {
  // URL is fixed (SYNC_URL); the token is the only thing that gates sync.
  if (stopped) return null
  const { syncToken } = useStore.getState().settings
  if (!syncToken) return null
  return { token: syncToken, url: SYNC_URL }
}

function localData(): SyncData {
  const { masterItems, kits, trips } = useStore.getState()
  return { masterItems, kits, trips }
}

// Turn an HTTP status into a human-readable sync-failure message.
function syncErrorMessage(status: number): string {
  if (status === 401) return 'Sync failed: not authorized — check your connection passphrase in Manage.'
  if (status === 400) return 'Sync failed: the server rejected a change (possibly a device clock issue).'
  return `Sync failed (HTTP ${status}).`
}

// Record a sync failure. The syncStatusStore is the source of truth for the
// previous status, so we only toast when TRANSITIONING into error — repeated
// failures update the status silently instead of spamming toasts.
function reportFailure(msg: string) {
  const wasError = useSyncStatusStore.getState().status === 'error'
  reportSyncError(msg)
  if (!wasError) toastError(msg)
}

// Canonical form of a data doc (sorted, deduped) for change detection.
function canon(d: Partial<SyncData>): string {
  return canonicalJSON(mergeData(d, {}))
}

// Apply server-derived data WITHOUT triggering a save (breaks the save->adopt loop).
// Only the three data slices are touched; device-local settings are preserved.
function applyRemote(merged: SyncData) {
  applyingRemote = true
  try {
    useStore.setState({
      masterItems: merged.masterItems,
      kits: merged.kits,
      trips: merged.trips,
    })
  } finally {
    applyingRemote = false
  }
}

// Stop syncing for this session when the server says our code is too old. The
// migrated server rejects v1 payloads (426) so a stale tab can't re-corrupt data.
function haltForVersion() {
  if (stopped) return
  stopped = true
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  toastError('App update needed — please reload the page.')
}

export async function loadFromServer(): Promise<boolean> {
  const config = getSyncConfig()
  if (!config) return false

  try {
    const res = await fetch(`${config.url}/api/data`, {
      headers: { 'Authorization': `Bearer ${config.token}` },
    })
    if (res.status === 426) { haltForVersion(); return false }
    if (!res.ok) { reportFailure(syncErrorMessage(res.status)); return false }

    const server = (await res.json()) as Partial<SyncData>
    const local = localData()
    const merged = mergeData(local, server) as SyncData

    // Only adopt if the merge changes our local state (guards the ping-pong).
    if (canonicalJSON(merged) !== canon(local)) {
      applyRemote(merged)
    }
    // Push back only if WE hold data the server lacks (merged differs from server).
    if (canonicalJSON(merged) !== canon(server)) {
      await saveToServer()
    }
    reportSyncSuccess()
    return true
  } catch {
    reportFailure('Sync failed: could not reach the server (offline?).')
    return false
  }
}

export async function saveToServer(): Promise<boolean> {
  const config = getSyncConfig()
  if (!config) return false

  try {
    const { masterItems, kits, trips } = useStore.getState()
    // Secrets (openRouterApiKey/syncToken/syncUrl) and device-local flags are
    // NEVER sent — the payload is data only, plus the schema version gate.
    const res = await fetch(`${config.url}/api/data`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ schemaVersion: SCHEMA_VERSION, masterItems, kits, trips }),
    })
    if (res.status === 426) { haltForVersion(); return false }
    if (!res.ok) { reportFailure(syncErrorMessage(res.status)); return false }

    // The server returns the merged doc — fold anything new back in, under the
    // guard so this adoption doesn't schedule another save.
    const serverMerged = (await res.json()) as Partial<SyncData>
    const local = localData()
    const folded = mergeData(local, serverMerged) as SyncData
    if (canonicalJSON(folded) !== canon(local)) {
      applyRemote(folded)
    }
    reportSyncSuccess()
    return true
  } catch {
    reportFailure('Sync failed: could not reach the server (offline?).')
    return false
  }
}

// On-demand reconcile (e.g. a "Sync now" button): cancels any pending debounced
// save and immediately loads/merges with the server instead.
export async function syncNow(): Promise<boolean> {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  return loadFromServer()
}

export function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => { saveTimer = null; saveToServer() }, 1500)
}

// Flush a pending save immediately (e.g. when the tab is being backgrounded).
function flushSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  if (getSyncConfig()) saveToServer()
}

// Best-effort save during page teardown. keepalive lets the request outlive the
// page; we don't read the response. Self-heals on the next foreground pull anyway.
function keepaliveSave() {
  const config = getSyncConfig()
  if (!config) return
  const { masterItems, kits, trips } = useStore.getState()
  try {
    fetch(`${config.url}/api/data`, {
      method: 'PUT',
      keepalive: true,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ schemaVersion: SCHEMA_VERSION, masterItems, kits, trips }),
    }).catch(() => {})
  } catch {
    /* page is going away; nothing more to do */
  }
}

export async function startSync() {
  // Pull once at boot (non-destructive merge), THEN subscribe — so an auto-save
  // can never fire against state that hasn't been reconciled with the server yet.
  await loadFromServer()

  if (!subscribed) {
    subscribed = true
    useStore.subscribe(() => {
      if (applyingRemote) return // server-applied changes must not echo back as a save
      if (getSyncConfig()) debouncedSave()
    })
  }

  if (typeof document !== 'undefined' && !listenersAttached) {
    listenersAttached = true
    // Flush on background, pull on foreground. A foreground pull merges by
    // last-write-wins; it never blindly overwrites, but a genuinely-newer
    // remote record can replace a local one (that's correct LWW behavior).
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushSave()
      else loadFromServer()
    })
    // bfcache restore (iOS Safari) fires pageshow, not visibilitychange.
    window.addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) loadFromServer() })
    window.addEventListener('pagehide', () => keepaliveSave())
  }
}
