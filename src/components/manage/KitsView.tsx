import { useState } from 'react'
import { useStore } from '../../store'
import type { Kit } from '../../types'
import { KitForm } from './KitForm'
import { toastUndo } from '../../store/toastStore'

export function KitsView() {
  const kits = useStore(s => s.kits).filter(k => k.deletedAt == null)
  const masterItems = useStore(s => s.masterItems).filter(i => !i.deletedAt)
  const deleteKit = useStore(s => s.deleteKit)
  const addKit = useStore(s => s.addKit)
  const [editing, setEditing] = useState<Kit | null | 'new'>(null)

  function itemName(id: string) {
    return masterItems.find(i => i.id === id)?.name ?? id
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setEditing('new')} className="px-3 py-1.5 bg-[#2d2d2d] text-white rounded text-sm">+ New kit</button>
      </div>
      {kits.map(kit => (
        <div key={kit.id} className="border-[1.5px] border-[#ddd] rounded p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[#2d2d2d] font-semibold">{kit.name}</h3>
            <div className="flex gap-2">
              <button onClick={() => setEditing(kit)} className="font-mono text-[10px] text-[#ccc] hover:text-[#2d2d2d]">edit</button>
              <button onClick={() => {
                  const savedKit = { name: kit.name, items: [...kit.items] }
                  deleteKit(kit.id)
                  toastUndo(`Kit "${kit.name}" deleted`, () => addKit(savedKit))
                }} className="font-mono text-[10px] text-[#ccc] hover:text-[#e05a33]">delete</button>
            </div>
          </div>
          <div className="space-y-1">
            {kit.items.map((ki, i) => (
              <div key={i} className="text-sm text-[#999] flex gap-2">
                <span>{itemName(ki.masterItemId)}</span>
                {ki.qty > 1 && <span className="font-mono text-[10px] text-[#999]">×{ki.qty}</span>}
                {ki.swapsItemId && <span className="text-[#e05a33]">replaces {itemName(ki.swapsItemId)}</span>}
              </div>
            ))}
            {kit.items.length === 0 && <p className="text-xs text-[#999]">No items — edit to add some.</p>}
          </div>
        </div>
      ))}
      {kits.length === 0 && (
        <p className="text-sm text-[#999] text-center py-6">No kits yet. Create one to group items for specific trip types.</p>
      )}
      {editing && <KitForm kit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
