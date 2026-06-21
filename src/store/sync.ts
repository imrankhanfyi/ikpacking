import { useStore } from './index'

let saveTimer: ReturnType<typeof setTimeout> | null = null
let loaded = false

function getSyncConfig() {
  const { syncToken, syncUrl } = useStore.getState().settings
  if (!syncToken || !syncUrl) return null
  return { token: syncToken, url: syncUrl.replace(/\/$/, '') }
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
    // Only apply if server has actual data (not empty object)
    if (data.masterItems && data.masterItems.length > 0) {
      useStore.setState({
        masterItems: data.masterItems,
        kits: data.kits ?? [],
        trips: data.trips ?? [],
        settings: { ...useStore.getState().settings, ...data.settings },
      })
      return true
    }
    // Server is empty — push current local data up
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
  await loadFromServer()
  loaded = true

  useStore.subscribe(() => {
    if (getSyncConfig()) debouncedSave()
  })

  const handleVisibility = async () => {
    if (document.visibilityState === 'visible') {
      // Flush any pending debounced save before reloading so we don't lose local edits
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
        await saveToServer()
      }
      await loadFromServer()
    }
  }

  document.addEventListener('visibilitychange', handleVisibility)
}
