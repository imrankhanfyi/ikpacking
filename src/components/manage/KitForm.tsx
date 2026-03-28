import { useState } from 'react'
import { useStore } from '../../store'
import type { Kit, KitItem } from '../../types'
import { Modal } from '../common/Modal'

export function KitForm({ kit, onClose }: { kit: Kit | null; onClose: () => void }) {
  const allItems = useStore(s => s.masterItems)
  const masterItems = allItems.filter(i => !i.deletedAt)
  const addKit = useStore(s => s.addKit)
  const updateKit = useStore(s => s.updateKit)

  const [nameError, setNameError] = useState(false)
  const [name, setName] = useState(kit?.name ?? '')
  const [items, setItems] = useState<KitItem[]>(kit?.items ?? [])
  const [search, setSearch] = useState('')

  const filteredMaster = masterItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) &&
    !items.some(ki => ki.masterItemId === i.id)
  )

  function addItem(masterItemId: string) {
    setItems(prev => [...prev, { masterItemId, qty: 1 }])
    setSearch('')
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function updateItem(index: number, updates: Partial<KitItem>) {
    setItems(prev => prev.map((ki, i) => i === index ? { ...ki, ...updates } : ki))
  }

  function handleSave() {
    if (!name.trim()) { setNameError(true); return }
    setNameError(false)
    if (kit) updateKit(kit.id, { name, items })
    else addKit({ name, items })
    onClose()
  }

  function itemName(id: string) {
    return masterItems.find(i => i.id === id)?.name ?? id
  }

  return (
    <Modal title={kit ? 'Edit kit' : 'New kit'} onClose={onClose}>
      <div className="space-y-4">
        <input value={name} onChange={e => { setName(e.target.value); setNameError(false) }} placeholder="Kit name (e.g. Hiking)" className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 ${nameError ? 'border-red-500' : 'border-slate-700'}`} />
        {nameError && <p className="text-xs text-red-400">Name is required</p>}

        <div>
          <p className="text-xs text-slate-500 mb-1">Items in this kit</p>
          <div className="space-y-2 mb-2">
            {items.map((ki, i) => (
              <div key={i} className="flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                <span className="flex-1 text-sm text-slate-200">{itemName(ki.masterItemId)}</span>
                <input type="number" min={1} value={ki.qty} onChange={e => updateItem(i, { qty: Number(e.target.value) })}
                  className="w-14 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-100 text-center focus:outline-none" />
                <select
                  value={ki.swapsItemId ?? ''}
                  onChange={e => updateItem(i, { swapsItemId: e.target.value || undefined })}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                >
                  <option value="">no swap</option>
                  {masterItems.filter(m => m.id !== ki.masterItemId).map(m => (
                    <option key={m.id} value={m.id}>replaces: {m.name}</option>
                  ))}
                </select>
                <button onClick={() => removeItem(i)} className="text-slate-600 hover:text-red-400 text-xs">✕</button>
              </div>
            ))}
          </div>

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search master items to add..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-indigo-500" />
          {search && (
            <div className="mt-1 max-h-32 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg divide-y divide-slate-700">
              {filteredMaster.slice(0, 8).map(m => (
                <button key={m.id} onClick={() => addItem(m.id)} className="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700">
                  {m.name} <span className="text-slate-500 text-xs">· {m.category}</span>
                </button>
              ))}
              {filteredMaster.length === 0 && <p className="px-3 py-2 text-xs text-slate-500">No matches</p>}
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={!name.trim()} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">Save kit</button>
      </div>
    </Modal>
  )
}
