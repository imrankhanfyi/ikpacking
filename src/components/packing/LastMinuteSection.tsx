import { useState } from 'react'
import type { TripItem } from '../../types'
import { useStore } from '../../store'

interface Props { items: TripItem[]; onToggle: (id: string) => void; tripId: string }

export function LastMinuteSection({ items, onToggle, tripId }: Props) {
  const addTripItem = useStore(s => s.addTripItem)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  if (items.length === 0) return null

  function handleAdd() {
    if (!newName.trim()) return
    addTripItem(tripId, {
      masterItemId: null, name: newName.trim(), qty: 1, isIncluded: true, isPacked: false,
      isLastMinute: true, isEssential: false, category: 'Misc'
    })
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="mt-6 border-[1.5px] border-[#e05a33] rounded bg-[#fef8f5] p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[3px] text-[#e05a33] font-bold">Last-minute</h3>
        <span className="text-xs text-[#999]">pack when you're done using them</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map(item => (
          <button key={item.id} onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 rounded text-sm text-left transition-colors min-h-[44px] ${
              item.isPacked ? 'border-[1.5px] border-[#e05a33] bg-[#e05a33] text-white px-3 py-2.5 opacity-40' : 'border-[1.5px] border-[#e05a33] text-[#e05a33] px-3 py-2.5'
            }`}
          >
            <span className={`w-4 h-4 rounded-[2px] border-[1.5px] flex-shrink-0 flex items-center justify-center text-[10px] ${
              item.isPacked ? 'bg-[#e05a33] border-[#e05a33] text-white' : item.isEssential ? 'border-[#e05a33]' : 'border-[#ddd]'
            }`}>
              {item.isPacked && '✓'}
            </span>
            <span className={item.isPacked ? 'line-through' : ''}>{item.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-3">
        {adding ? (
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Item name..." autoFocus
              className="flex-1 bg-white border-[1.5px] border-[#ddd] rounded px-3 py-2 text-sm text-[#2d2d2d] focus:outline-none focus:border-[#2d2d2d]" />
            <button onClick={handleAdd} className="px-3 py-2 bg-[#2d2d2d] text-white rounded text-sm">Add</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="text-[#e05a33] font-mono text-[11px] uppercase tracking-[2px] hover:opacity-70">+ Add last-minute item</button>
        )}
      </div>
    </div>
  )
}
