import { useState } from 'react'
import { useStore } from '../../store'
import type { MasterItem } from '../../types'
import { TagChip } from '../common/TagChip'
import { ItemForm } from './ItemForm'

export function MasterListView() {
  const masterItems = useStore(s => s.masterItems)
  const deleteMasterItem = useStore(s => s.deleteMasterItem)
  const [editing, setEditing] = useState<MasterItem | null | 'new'>(null)
  const [filter, setFilter] = useState('')

  const filtered = masterItems.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()))
  const grouped = filtered.reduce((acc, item) => {
    acc[item.category] = [...(acc[item.category] ?? []), item]
    return acc
  }, {} as Record<string, MasterItem[]>)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter items..." className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
        <button onClick={() => setEditing('new')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">+ Add item</button>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{cat}</h3>
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 py-2 border-b border-slate-800">
                <span className="flex-1 text-sm text-slate-200">{item.name}</span>
                <div className="flex gap-1">{item.tags.map(t => <TagChip key={t} tag={t} />)}</div>
                {item.isEssential && <span className="text-xs text-amber-500">essential</span>}
                {item.isLastMinute && <span className="text-xs text-slate-500">last-min</span>}
                <span className="text-xs text-slate-600">{item.qtyBasis === 'per-day' ? '×/day' : `×${item.defaultQty}`}</span>
                <button onClick={() => setEditing(item)} className="text-xs text-slate-600 hover:text-indigo-400">edit</button>
                <button onClick={() => deleteMasterItem(item.id)} className="text-xs text-slate-600 hover:text-red-400">del</button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {editing && <ItemForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
