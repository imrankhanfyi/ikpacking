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

  const grouped = masterItems
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce<Record<string, typeof masterItems>>((acc, item) => {
      const cat = item.category ?? 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  const categories = Object.keys(grouped).sort()

  function isInKit(masterItemId: string) {
    return items.some(ki => ki.masterItemId === masterItemId)
  }

  function kitIndex(masterItemId: string) {
    return items.findIndex(ki => ki.masterItemId === masterItemId)
  }

  function toggleItem(masterItemId: string) {
    const idx = kitIndex(masterItemId)
    if (idx >= 0) {
      setItems(prev => prev.filter((_, i) => i !== idx))
    } else {
      setItems(prev => [...prev, { masterItemId, qty: 1 }])
    }
  }

  function updateQty(masterItemId: string, qty: number) {
    setItems(prev => prev.map(ki => ki.masterItemId === masterItemId ? { ...ki, qty } : ki))
  }

  function handleSave() {
    if (!name.trim()) { setNameError(true); return }
    setNameError(false)
    if (kit) updateKit(kit.id, { name, items })
    else addKit({ name, items })
    onClose()
  }

  return (
    <Modal title={kit ? 'Edit kit' : 'New kit'} onClose={onClose} wide>
      <div className="space-y-4">
        <input value={name} onChange={e => { setName(e.target.value); setNameError(false) }} placeholder="Kit name (e.g. Hiking)" className={`w-full bg-white border-[1.5px] rounded px-3 py-2 text-[#2d2d2d] text-sm focus:outline-none focus:border-[#2d2d2d] ${nameError ? 'border-[#e05a33]' : 'border-[#ddd]'}`} />
        {nameError && <p className="text-xs text-[#e05a33]">Name is required</p>}

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-[#999] mb-2">
            Items in this kit <span className="normal-case tracking-normal">{items.length > 0 && `· ${items.length} selected`}</span>
          </p>
          <div className="max-h-[60vh] overflow-y-auto border-[1.5px] border-[#ddd] rounded divide-y divide-[#eee]">
            {categories.map(cat => (
              <div key={cat}>
                <div className="px-3 py-1.5 bg-[#f9f8f6] font-mono text-[10px] uppercase tracking-[2px] text-[#bbb] sticky top-0">
                  {cat}
                </div>
                {grouped[cat].map(m => {
                  const checked = isInKit(m.id)
                  const ki = checked ? items[kitIndex(m.id)] : null
                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleItem(m.id)}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer select-none ${checked ? 'bg-[#f5f3ef]' : 'hover:bg-[#fafafa]'}`}
                    >
                      <span className={`w-4 text-center text-xs font-bold ${checked ? 'text-[#2d2d2d]' : 'text-[#ddd]'}`}>
                        {checked ? '✓' : '○'}
                      </span>
                      <span className="flex-1 text-sm text-[#2d2d2d]">{m.name}</span>
                      {checked && ki && (
                        <input
                          type="number"
                          min={1}
                          value={ki.qty}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateQty(m.id, Number(e.target.value))}
                          className="w-14 bg-white border-[1.5px] border-[#ddd] rounded px-2 py-1 text-xs text-[#2d2d2d] text-center focus:outline-none focus:border-[#2d2d2d]"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={!name.trim()} className="w-full py-2 bg-[#2d2d2d] disabled:opacity-50 text-white rounded text-sm font-bold">Save kit</button>
      </div>
    </Modal>
  )
}
