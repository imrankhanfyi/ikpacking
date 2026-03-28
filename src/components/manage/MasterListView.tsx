import { useState } from 'react'
import { useStore } from '../../store'
import type { MasterItem } from '../../types'
import { TagChip } from '../common/TagChip'
import { ItemForm } from './ItemForm'
import { toastUndo } from '../../store/toastStore'

export function MasterListView() {
  const masterItems = useStore(s => s.masterItems).filter(i => !i.deletedAt)
  const deleteMasterItem = useStore(s => s.deleteMasterItem)
  const restoreMasterItem = useStore(s => s.restoreMasterItem)
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
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter items..." className="flex-1 bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] rounded px-3 py-1.5 text-sm focus:border-[#2d2d2d] focus:outline-none" />
        <button onClick={() => setEditing('new')} className="px-3 py-1.5 bg-[#2d2d2d] text-white rounded text-sm">+ Add item</button>
      </div>

      {Object.entries(grouped).map(([cat, items]) => (
        <section key={cat}>
          <h3 className="font-mono text-[10px] uppercase tracking-[3px] text-[#999] border-b-[1.5px] border-[#2d2d2d] pb-1 mb-2">{cat}</h3>
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 border-b border-[#eee]">
                <span className="text-sm text-[#2d2d2d] cursor-pointer hover:text-[#e05a33]" onClick={() => setEditing(item)}>{item.name}</span>
                <div className="flex gap-1">{item.tags.map(t => <TagChip key={t} tag={t} />)}</div>
                {item.isEssential && <span className="text-[#e05a33] font-mono text-[10px]">essential</span>}
                {item.isLastMinute && <span className="text-[#999] font-mono text-[10px]">last-min</span>}
                <span className="font-mono text-[10px] text-[#999]">{item.qtyBasis === 'per-day' ? '×/day' : `×${item.defaultQty}`}</span>
                <span className="flex-1" />
                <button onClick={() => setEditing(item)} className="font-mono text-[10px] text-[#ccc] hover:text-[#e05a33]">edit</button>
                <button onClick={() => {
                  deleteMasterItem(item.id)
                  toastUndo(`"${item.name}" moved to trash`, () => restoreMasterItem(item.id))
                }} className="font-mono text-[10px] text-[#ccc] hover:text-[#e05a33]">del</button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {filter && Object.keys(grouped).length === 0 && (
        <p className="text-sm text-[#999] text-center py-6">No items match "{filter}".</p>
      )}

      {editing && <ItemForm item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
