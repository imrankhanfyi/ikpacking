import { useState } from 'react'
import { useStore } from '../../store'
import { importNotionList } from '../../ai/importNotion'
import type { ImportedItem } from '../../ai/importNotion'

export function NotionImport() {
  const [markdown, setMarkdown] = useState('')
  const [parsed, setParsed] = useState<ImportedItem[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(false)
  const settings = useStore(s => s.settings)
  const masterItems = useStore(s => s.masterItems.filter(i => !i.deletedAt))
  const addMasterItem = useStore(s => s.addMasterItem)

  async function handleParse() {
    if (!settings.openRouterApiKey) { alert('Set an API key first in API Settings.'); return }
    setLoading(true)
    try {
      const items = await importNotionList(settings.openRouterApiKey, markdown)
      const existingNames = new Set(masterItems.map(i => i.name.toLowerCase()))
      const sel = new Set(items.map((_, i) => i).filter(i => !items[i].isDuplicate && !existingNames.has(items[i].name.toLowerCase())))
      setParsed(items)
      setSelected(sel)
    } catch (e) {
      alert('Failed to parse. Try again or paste fewer lists at once.')
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
    alert(`Imported ${selected.size} items.`)
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300">Import from Notion</h3>
      <p className="text-xs text-slate-500">Paste one or more Notion packing lists (markdown format). The AI will parse them, deduplicate, and let you review before importing.</p>

      {!parsed && (
        <>
          <textarea value={markdown} onChange={e => setMarkdown(e.target.value)} placeholder="Paste Notion packing list markdown here..." rows={12} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-y" />
          <button onClick={handleParse} disabled={loading || !markdown.trim()} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">
            {loading ? 'Parsing...' : 'Parse with AI →'}
          </button>
        </>
      )}

      {parsed && (
        <>
          <p className="text-xs text-slate-400">{parsed.length} items found. {selected.size} selected to import.</p>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {parsed.map((item, i) => (
              <label key={i} className={`flex items-center gap-3 py-2 border-b border-slate-800 cursor-pointer ${item.isDuplicate ? 'opacity-50' : ''}`}>
                <input type="checkbox" checked={selected.has(i)} onChange={e => {
                  const s = new Set(selected)
                  e.target.checked ? s.add(i) : s.delete(i)
                  setSelected(s)
                }} />
                <span className="flex-1 text-sm text-slate-200">{item.name}</span>
                <span className="text-xs text-slate-500">{item.category}</span>
                {item.isDuplicate && <span className="text-xs text-amber-500">possible duplicate</span>}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setParsed(null)} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm">← Back</button>
            <button onClick={handleImport} disabled={selected.size === 0} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">Import {selected.size} items</button>
          </div>
        </>
      )}
    </div>
  )
}
