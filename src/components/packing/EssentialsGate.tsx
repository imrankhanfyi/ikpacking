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
      <p className="text-sm text-[#999] mb-4">Confirm you have these essentials packed.</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {items.map(item => {
          const isConfirmed = confirmed.has(item.id)
          return (
            <label key={item.id}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm cursor-pointer transition-colors ${
                isConfirmed ? 'bg-[#f0f7f3] text-[#2a6e4e] border-[1.5px] border-[#2a6e4e]' : 'bg-white border-[1.5px] border-[#ddd] text-[#2d2d2d] hover:border-[#2d2d2d]'
              }`}
            >
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={() => setConfirmed(s => { const n = new Set(s); isConfirmed ? n.delete(item.id) : n.add(item.id); return n })}
                className="rounded border-[#ddd]"
              />
              {item.name}
            </label>
          )
        })}
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} className="px-4 py-2 bg-[#f5f3ef] text-[#999] rounded text-sm">&larr; Back</button>
        <button onClick={onConfirm} disabled={!allConfirmed}
          className={`flex-1 py-2 rounded text-sm font-bold transition-colors ${allConfirmed ? 'bg-[#2a6e4e] text-white hover:bg-[#1e5a3d]' : 'bg-[#f5f3ef] text-[#ccc] cursor-not-allowed'}`}
        >
          {allConfirmed ? 'All in — close trip ✓' : `${items.length - confirmed.size} remaining`}
        </button>
      </div>
    </Modal>
  )
}
