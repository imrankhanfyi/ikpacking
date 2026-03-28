import { useState } from 'react'
import { useStore } from '../../store'
import { importNotionList } from '../../ai/importNotion'
import type { ImportedItem } from '../../ai/importNotion'
import { toast } from '../../store/toastStore'

export function NotionImport() {
  const [markdown, setMarkdown] = useState('')
  const [parsed, setParsed] = useState<ImportedItem[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const settings = useStore(s => s.settings)
  const masterItems = useStore(s => s.masterItems).filter(i => !i.deletedAt)
  const addMasterItem = useStore(s => s.addMasterItem)

  async function handleParse() {
    setError('')
    if (!settings.openRouterApiKey) { setError('Set an API key first in API Settings.'); return }
    setLoading(true)
    try {
      const items = await importNotionList(settings.openRouterApiKey, markdown)
      const existingNames = new Set(masterItems.map(i => i.name.toLowerCase()))
      const sel = new Set(items.map((_, i) => i).filter(i => !items[i].isDuplicate && !existingNames.has(items[i].name.toLowerCase())))
      setParsed(items)
      setSelected(sel)
    } catch (e) {
      setError('Failed to parse. Try again or paste fewer items.')
    } finally {
      setLoading(false)
    }
  }

  function handleImport() {
    if (!parsed) return
    parsed.forEach((item, i) => {
      if (selected.has(i)) addMasterItem(item)
    })
    setParsed(null)
    setMarkdown('')
    toast(`Imported ${selected.size} items.`)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[#2d2d2d]">Import from Notion</h3>
      <p className="text-xs text-[#999]">Paste one or more Notion packing lists (markdown format). The AI will parse them, deduplicate, and let you review before importing.</p>

      {!parsed && (
        <>
          {error && <p className="text-sm text-[#e05a33]">{error}</p>}
          <textarea value={markdown} onChange={e => setMarkdown(e.target.value)} placeholder="Paste Notion packing list markdown here..." rows={12} className="w-full font-mono bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded px-3 py-2 text-sm focus:border-[#2d2d2d] focus:outline-none resize-y" />
          <button onClick={handleParse} disabled={loading || !markdown.trim()} className="w-full py-2 bg-[#2d2d2d] disabled:opacity-50 text-white rounded text-sm font-bold">
            {loading ? 'Parsing...' : 'Parse with AI →'}
          </button>
        </>
      )}

      {parsed && parsed.length === 0 && (
        <p className="text-sm text-[#999]">No items found in that file.</p>
      )}

      {parsed && parsed.length > 0 && (
        <>
          <p className="text-xs text-[#999]">{parsed.length} items found. {selected.size} selected to import.</p>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {parsed.map((item, i) => (
              <label key={i} className={`flex items-center gap-3 py-2 border-b border-[#eee] cursor-pointer ${item.isDuplicate ? 'opacity-50' : ''}`}>
                <input type="checkbox" checked={selected.has(i)} onChange={e => {
                  const s = new Set(selected)
                  e.target.checked ? s.add(i) : s.delete(i)
                  setSelected(s)
                }} />
                <span className="flex-1 text-sm text-[#2d2d2d]">{item.name}</span>
                <span className="text-xs text-[#999]">{item.category}</span>
                {item.isDuplicate && <span className="text-xs text-[#e05a33]">possible duplicate</span>}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setParsed(null)} className="px-4 py-2 bg-[#f5f3ef] text-[#999] rounded text-sm">← Back</button>
            <button onClick={handleImport} disabled={selected.size === 0} className="flex-1 py-2 bg-[#2d2d2d] disabled:opacity-50 text-white rounded text-sm font-bold">Import {selected.size} items</button>
          </div>
        </>
      )}
    </div>
  )
}
