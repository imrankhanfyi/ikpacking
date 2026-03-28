import { useState } from 'react'
import { useStore } from '../../store'
import { loadFromServer } from '../../store/sync'
import { toast, toastError } from '../../store/toastStore'

export function ApiSettings() {
  const settings = useStore(s => s.settings)
  const updateSettings = useStore(s => s.updateSettings)
  const [draft, setDraft] = useState(settings.openRouterApiKey)
  const [syncUrl, setSyncUrl] = useState(settings.syncUrl)
  const [syncToken, setSyncToken] = useState(settings.syncToken)
  const [syncing, setSyncing] = useState(false)

  async function handleSaveSync() {
    updateSettings({ syncUrl, syncToken })
    setSyncing(true)
    // Test the connection
    try {
      const res = await fetch(`${syncUrl.replace(/\/$/, '')}/api/data`, {
        headers: { 'Authorization': `Bearer ${syncToken}` },
      })
      if (res.ok) {
        toast('Sync connected. Loading data from server...')
        await loadFromServer()
      } else {
        toastError('Connection failed — check URL and token.')
      }
    } catch {
      toastError('Could not reach sync server.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[#2d2d2d]">OpenRouter API key</h3>
        <p className="text-xs text-[#999]">Used for AI trip generation and pattern learning.</p>
        <input type="password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="sk-or-..." className="w-full bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2d2d2d]" />
        <button onClick={() => updateSettings({ openRouterApiKey: draft })} className="px-4 py-2 bg-[#2d2d2d] text-white rounded text-sm">Save key</button>
        {settings.openRouterApiKey && <p className="text-xs text-[#2a6e4e]">Key saved</p>}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-[#2d2d2d]">Server sync</h3>
        <p className="text-xs text-[#999]">Sync your data across devices via a server. Enter the server URL and token.</p>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[2px] text-[#999]">Server URL</label>
          <input value={syncUrl} onChange={e => setSyncUrl(e.target.value)} placeholder="http://94.130.96.213" className="w-full mt-1 bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2d2d2d]" />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[2px] text-[#999]">Sync token</label>
          <input type="password" value={syncToken} onChange={e => setSyncToken(e.target.value)} placeholder="your-sync-token" className="w-full mt-1 bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#2d2d2d]" />
        </div>
        <button onClick={handleSaveSync} disabled={syncing || !syncUrl.trim() || !syncToken.trim()} className="px-4 py-2 bg-[#2d2d2d] text-white rounded text-sm disabled:opacity-50">
          {syncing ? 'Connecting...' : 'Save & connect'}
        </button>
        {settings.syncUrl && settings.syncToken && <p className="text-xs text-[#2a6e4e]">Sync active</p>}
      </section>
    </div>
  )
}
