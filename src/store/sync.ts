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
// only locally are preserved. Only safe for records with stable, globally-unique
// ids (trips) — NOT for seeded content, whose ids are regenerated per device.
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
    // The library (masterItems + kits) is SERVER-AUTHORITATIVE. Its ids are
    // re-seeded per device, so unioning would multiply it ("Razor" ×2). When the
    // server has a library we take it wholesale and discard the local seed; only
    // when the server is empty do we keep local (so a fresh server gets seeded
    // by the push below). Trips have stable ids and ARE unioned by id.
    const serverHasLibrary = Array.isArray(data.masterItems) && data.masterItems.length > 0

    useStore.setState({
      masterItems: serverHasLibrary ? (data.masterItems as MasterItem[]) : state.masterItems,
      kits: serverHasLibrary ? ((data.kits as Kit[]) ?? []) : state.kits,
      trips: mergeById<Trip>(state.trips, data.trips ?? []),
      settings: {
        ...state.settings,
        ...(data.settings ?? {}),
        // Auth + the (unused) URL are device-local; never let the server set them
        syncToken: state.settings.syncToken,
        syncUrl: state.settings.syncUrl,
      },
    })

    // Push the result back so the server gains any local-only trips (and gets
    // seeded if it was empty). Safe: the library is the server's own copy and
    // trips are a union — nothing is dropped.
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
