import { useState } from 'react'
import { useStore } from '../../store'

export function ApiSettings() {
  const apiKey = useStore(s => s.settings.openRouterApiKey)
  const updateSettings = useStore(s => s.updateSettings)
  const [draft, setDraft] = useState(apiKey)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">OpenRouter API key</h3>
      <p className="text-xs text-slate-500">Used for AI trip generation and pattern learning. Stored locally in your browser only.</p>
      <input type="password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="sk-or-..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500" />
      <button onClick={() => updateSettings({ openRouterApiKey: draft })} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm">Save key</button>
      {apiKey && <p className="text-xs text-green-500">✓ API key saved</p>}
    </div>
  )
}
