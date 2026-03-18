import { TripItem } from '../../types'
import { QtyBadge } from '../common/QtyBadge'

interface Props {
  item: TripItem
  onToggle: () => void
  onQtyChange: (qty: number) => void
  onRemove: () => void
}

export function PackingItem({ item, onToggle, onQtyChange, onRemove }: Props) {
  return (
    <div className={`flex items-center gap-2 py-1.5 border-b border-slate-900 group ${item.isPacked ? 'opacity-40' : ''}`}>
      <button onClick={onToggle}
        className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${item.isPacked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600'}`}
      >{item.isPacked && '✓'}</button>
      <span className={`text-sm flex-1 ${item.isPacked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
        {item.name}
        <QtyBadge qty={item.qty} onEdit={onQtyChange} />
      </span>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 text-xs text-slate-600 hover:text-red-400 transition-opacity">✕</button>
    </div>
  )
}
