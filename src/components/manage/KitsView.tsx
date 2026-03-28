import { useState } from 'react'
import { useStore } from '../../store'
import type { Kit } from '../../types'
import { KitForm } from './KitForm'
import { toastUndo } from '../../store/toastStore'

export function KitsView() {
  const kits = useStore(s => s.kits)
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
        <button onClick={() => setEditing('new')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm">+ New kit</button>
      </div>
      {kits.map(kit => (
        <div key={kit.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-slate-200">{kit.name}</h3>
            <div className="flex gap-2">
              <button onClick={() => setEditing(kit)} className="text-xs text-slate-500 hover:text-indigo-400">edit</button>
              <button onClick={() => {
                  const savedKit = { name: kit.name, items: [...kit.items] }
                  deleteKit(kit.id)
                  toastUndo(`Kit "${kit.name}" deleted`, () => addKit(savedKit))
                }} className="text-xs text-slate-500 hover:text-red-400">delete</button>
            </div>
          </div>
          <div className="space-y-1">
            {kit.items.map((ki, i) => (
              <div key={i} className="text-sm text-slate-400 flex gap-2">
                <span>{itemName(ki.masterItemId)}</span>
                {ki.qty > 1 && <span className="text-indigo-400">×{ki.qty}</span>}
                {ki.swapsItemId && <span className="text-amber-500">replaces {itemName(ki.swapsItemId)}</span>}
              </div>
            ))}
            {kit.items.length === 0 && <p className="text-xs text-slate-600">No items — edit to add some.</p>}
          </div>
        </div>
      ))}
      {kits.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-6">No kits yet. Create one to group items for specific trip types.</p>
      )}
      {editing && <KitForm kit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
