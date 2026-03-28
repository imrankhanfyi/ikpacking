import { useState } from 'react'
import { useStore } from '../../store'
import type { Kit, KitItem } from '../../types'
import { Modal } from '../common/Modal'

export function KitForm({ kit, onClose }: { kit: Kit | null; onClose: () => void }) {
  const masterItems = useStore(s => s.masterItems).filter(i => !i.deletedAt)
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
        <input value={name} onChange={e => { setName(e.target.value); setNameError(false) }} placeholder="Kit name (e.g. Hiking)" className={`w-full bg-white border-[1.5px] rounded px-3 py-2 text-[#2d2d2d] text-sm focus:outline-none focus:border-[#2d2d2d] ${nameError ? 'border-[#e05a33]' : 'border-[#ddd]'}`} />
        {nameError && <p className="text-xs text-[#e05a33]">Name is required</p>}

        <div>
          <p className="text-xs text-[#999] mb-1">Items in this kit</p>
          <div className="space-y-2 mb-2">
            {items.map((ki, i) => (
              <div key={i} className="flex items-center gap-2 bg-[#f5f3ef] rounded p-2">
                <span className="flex-1 text-sm text-[#2d2d2d]">{itemName(ki.masterItemId)}</span>
                <input type="number" min={1} value={ki.qty} onChange={e => updateItem(i, { qty: Number(e.target.value) })}
                  className="w-14 bg-white border-[1.5px] border-[#ddd] rounded px-2 py-1 text-xs text-[#2d2d2d] text-center focus:outline-none focus:border-[#2d2d2d]" />
                <select
                  value={ki.swapsItemId ?? ''}
                  onChange={e => updateItem(i, { swapsItemId: e.target.value || undefined })}
                  className="flex-1 bg-white border-[1.5px] border-[#ddd] rounded px-2 py-1 text-xs text-[#2d2d2d] focus:outline-none focus:border-[#2d2d2d]"
                >
                  <option value="">no swap</option>
                  {masterItems.filter(m => m.id !== ki.masterItemId).map(m => (
                    <option key={m.id} value={m.id}>replaces: {m.name}</option>
                  ))}
                </select>
                <button onClick={() => removeItem(i)} className="text-[#ccc] hover:text-[#e05a33] text-xs">✕</button>
              </div>
            ))}
          </div>

          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search master items to add..." className="w-full bg-white border-[1.5px] border-[#ddd] rounded px-3 py-1.5 text-sm text-[#2d2d2d] focus:outline-none focus:border-[#2d2d2d]" />
          {search && (
            <div className="mt-1 max-h-32 overflow-y-auto bg-white border-[1.5px] border-[#ddd] rounded divide-y divide-[#eee]">
              {filteredMaster.slice(0, 8).map(m => (
                <button key={m.id} onClick={() => addItem(m.id)} className="w-full text-left px-3 py-1.5 text-sm text-[#2d2d2d] hover:bg-[#f5f3ef]">
                  {m.name} <span className="text-[#999] text-xs">· {m.category}</span>
                </button>
              ))}
              {filteredMaster.length === 0 && <p className="px-3 py-2 text-xs text-[#999]">No matches</p>}
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={!name.trim()} className="w-full py-2 bg-[#2d2d2d] disabled:opacity-50 text-white rounded text-sm font-bold">Save kit</button>
      </div>
    </Modal>
  )
}
