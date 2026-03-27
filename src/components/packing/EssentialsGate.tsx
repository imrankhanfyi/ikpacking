import { useState } from 'react'
import type { TripItem } from '../../types'
import { Modal } from '../common/Modal'

interface Props { items: TripItem[]; onConfirm: () => void; onClose: () => void }

export function EssentialsGate({ items, onConfirm, onClose }: Props) {
  const [confirmed, setConfirmed] = useState<Set<string>>(
    new Set(items.filter(i => i.isPacked).map(i => i.id))
  )

  const allConfirmed = items.every(i => confirmed.has(i.id))

  return (
    <Modal title="⚡ Before you zip up..." onClose={onClose}>
      <p className="text-sm text-slate-400 mb-4">Confirm you have these essentials packed.</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {items.map(item => {
          const isConfirmed = confirmed.has(item.id)
          return (
            <label key={item.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                isConfirmed ? 'bg-green-900 text-green-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={() => setConfirmed(s => { const n = new Set(s); isConfirmed ? n.delete(item.id) : n.add(item.id); return n })}
                className="rounded border-slate-600"
              />
              {item.name}
            </label>
          )
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm">← Back</button>
        <button onClick={onConfirm} disabled={!allConfirmed}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${allConfirmed ? 'bg-green-700 text-white hover:bg-green-600' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}
        >
          {allConfirmed ? 'All in — close trip ✓' : `${items.length - confirmed.size} remaining`}
        </button>
      </div>
    </Modal>
  )
}
