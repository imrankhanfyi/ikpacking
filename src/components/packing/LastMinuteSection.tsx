import type { TripItem } from '../../types'
import { useStore } from '../../store'

interface Props { items: TripItem[]; onToggle: (id: string) => void; tripId: string }

export function LastMinuteSection({ items, onToggle, tripId }: Props) {
  const addTripItem = useStore(s => s.addTripItem)

  if (items.length === 0) return null

  function handleAdd() {
    const name = prompt('Item name:')
    if (!name) return
    addTripItem(tripId, {
      masterItemId: null, name, qty: 1, isIncluded: true, isPacked: false,
      isLastMinute: true, isEssential: false, category: 'Misc'
    })
  }

  return (
    <div className="mt-6 border-t-2 border-dashed border-amber-900/50 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">⏰</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600">Last-minute — morning of</h3>
        <span className="ml-auto text-xs text-slate-600">add when you're done using them</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map(item => (
          <button key={item.id} onClick={() => onToggle(item.id)}
            className={`flex items-center gap-2 p-2 rounded-lg border text-sm text-left transition-colors ${
              item.isEssential ? 'border-amber-800 bg-amber-950/50' : 'border-slate-800 bg-slate-900'
            } ${item.isPacked ? 'opacity-40' : ''}`}
          >
            <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center text-[9px] ${item.isPacked ? 'bg-indigo-600 border-indigo-600 text-white' : item.isEssential ? 'border-amber-700' : 'border-slate-600'}`}>
              {item.isPacked && '✓'}
            </span>
            <span className={item.isPacked ? 'line-through text-slate-500' : 'text-slate-300'}>{item.name}</span>
          </button>
        ))}
        <button onClick={handleAdd} className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-slate-700 text-slate-600 text-sm hover:border-slate-500 hover:text-slate-400">
          + Add
        </button>
      </div>
    </div>
  )
}
