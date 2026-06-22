import { useStore } from './index'
import { SYNC_URL } from '../constants'
import type { MasterItem, Kit, Trip } from '../types'

let saveTimer: ReturnType<typeof setTimeout> | null = null

function getSyncConfig() {
  // URL is fixed (SYNC_URL); the token is the only thing that gates sync.
  const { syncToken } = useStore.getState().settings
  if (!syncToken) return null
  return { token: syncToken, url: SYNC_URL }
}

// Union-merge two lists by id. Server wins on id collision; records that exist
// only locally are always preserved — so a trip created on this device can
// never be dropped by a load that happens before it has been saved up.
function mergeById<T extends { id: string }>(local: T[], server: T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of local) byId.set(item.id, item)
  for (const item of server) byId.set(item.id, item) // server wins on collision
  return [...byId.values()]
}

export async function loadFromServer(): Promise<boolean> {
  const config = getSyncConfig()
  if (!config) return false

  try {
    const res = await fetch(`${config.url}/api/data`, {
      headers: { 'Authorization': `Bearer ${config.token}` },
    })
    if (!res.ok) return false
    const data = await res.json()

    const state = useStore.getState()
    useStore.setState({
      masterItems: mergeById<MasterItem>(state.masterItems, data.masterItems ?? []),
      kits: mergeById<Kit>(state.kits, data.kits ?? []),
      trips: mergeById<Trip>(state.trips, data.trips ?? []),
      settings: {
        ...state.settings,
        ...(data.settings ?? {}),
        // Auth + the (unused) URL are device-local; never let the server set them
        syncToken: state.settings.syncToken,
        syncUrl: state.settings.syncUrl,
      },
    })

    // Push the merged result back so the server gains any local-only records.
    // Safe: a union only ever adds records, it never drops them.
    await saveToServer()
    return true
  } catch {
    return false
  }
}

export async function saveToServer(): Promise<boolean> {
  const config = getSyncConfig()
  if (!config) return false

  try {
    const { masterItems, kits, trips, settings } = useStore.getState()
    const res = await fetch(`${config.url}/api/data`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ masterItems, kits, trips, settings }),
    })
    return res.ok
  } catch {
    return false
  }
}

export function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => saveToServer(), 1500)
}

export async function startSync() {
  // Pull once at boot (non-destructive merge), then auto-save on every change.
  // No reload-on-focus: a load can only run at boot, when in-memory state
  // matches what's persisted — so it cannot clobber an unsaved local edit.
  await loadFromServer()

  useStore.subscribe(() => {
    if (getSyncConfig()) debouncedSave()
  })
}
