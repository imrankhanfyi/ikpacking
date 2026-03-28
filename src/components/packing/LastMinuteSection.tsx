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
    <div className="mt-6 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-500">Last-minute</h3>
        <span className="text-xs text-slate-600">pack when you're done using them</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map(item => (
          <button key={item.id} onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors min-h-[44px] ${
              item.isEssential ? 'border-amber-800 bg-amber-950/50' : 'border-slate-700 bg-slate-900'
            } ${item.isPacked ? 'opacity-40' : ''}`}
          >
            <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
              item.isPacked ? 'bg-indigo-600 border-indigo-600 text-white' : item.isEssential ? 'border-amber-700' : 'border-slate-600'
            }`}>
              {item.isPacked && '✓'}
            </span>
            <span className={item.isPacked ? 'line-through text-slate-500' : 'text-slate-300'}>{item.name}</span>
          </button>
        ))}
      </div>
      <div className="mt-3">
        {adding ? (
          <div className="flex gap-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="Item name..." autoFocus
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
            <button onClick={handleAdd} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">Add</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="text-sm text-amber-500 hover:text-amber-400">+ Add last-minute item</button>
        )}
      </div>
    </div>
  )
}
