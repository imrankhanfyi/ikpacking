import { useState } from 'react'
import { useStore } from '../../store'
import { useSyncStatusStore } from '../../store/syncStatusStore'
import { syncNow } from '../../store/sync'

export function SyncNowButton() {
  const syncToken = useStore(s => s.settings.syncToken)
  const status = useSyncStatusStore(s => s.status)
  const lastSyncedAt = useSyncStatusStore(s => s.lastSyncedAt)
  const lastError = useSyncStatusStore(s => s.lastError)
  const [syncing, setSyncing] = useState(false)

  if (!syncToken) return null

  async function handleSync() {
    if (syncing) return
    setSyncing(true)
    try {
      await syncNow()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="text-right">
      <button onClick={handleSync} disabled={syncing} className="text-[#e05a33] font-mono text-[11px] uppercase tracking-[2px] hover:opacity-70 disabled:opacity-50">
        {syncing ? '⟳ Syncing…' : '⟳ Sync now'}
      </button>
      {syncing && <p className="text-xs text-[#999]">Syncing…</p>}
      {!syncing && status === 'ok' && lastSyncedAt && (
        <p className="text-xs text-[#2a6e4e]">✓ Synced {new Date(lastSyncedAt).toLocaleTimeString()}</p>
      )}
      {!syncing && status === 'error' && lastError && (
        <p className="text-xs text-[#e05a33]">⚠ {lastError}</p>
      )}
    </div>
  )
}
