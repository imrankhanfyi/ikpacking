import { useState } from 'react'
import { useStore } from '../../store'

export function ApiSettings() {
  const apiKey = useStore(s => s.settings.openRouterApiKey)
  const updateSettings = useStore(s => s.updateSettings)
  const [draft, setDraft] = useState(apiKey)

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[#2d2d2d]">OpenRouter API key</h3>
      <p className="text-xs text-[#999]">Used for AI trip generation and pattern learning. Stored locally in your browser only.</p>
      <input type="password" value={draft} onChange={e => setDraft(e.target.value)} placeholder="sk-or-..." className="w-full bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#2d2d2d]" />
      <button onClick={() => updateSettings({ openRouterApiKey: draft })} className="px-4 py-2 bg-[#2d2d2d] text-white rounded text-sm">Save key</button>
      {apiKey && <p className="text-xs text-[#2a6e4e]">✓ API key saved</p>}
    </div>
  )
}
