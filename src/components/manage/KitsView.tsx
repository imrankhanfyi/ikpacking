import { useState } from 'react'
import { useStore } from '../../store'
import type { Kit } from '../../types'
import { KitForm } from './KitForm'

export function KitsView() {
  const kits = useStore(s => s.kits)
  const masterItems = useStore(s => s.masterItems)
  const deleteKit = useStore(s => s.deleteKit)
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
              <button onClick={() => deleteKit(kit.id)} className="text-xs text-slate-500 hover:text-red-400">delete</button>
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
      {editing && <KitForm kit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
