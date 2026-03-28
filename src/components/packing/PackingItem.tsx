import type { TripItem } from '../../types'
import { QtyBadge } from '../common/QtyBadge'
import { toastUndo } from '../../store/toastStore'

interface Props {
  item: TripItem
  onToggle: () => void
  onQtyChange: (qty: number) => void
  onRemove: () => void
  onRestore: () => void
}

export function PackingItem({ item, onToggle, onQtyChange, onRemove, onRestore }: Props) {
  function handleRemove() {
    onRemove()
    toastUndo(`"${item.name}" removed`, onRestore)
  }

  return (
    <div className={`flex items-center gap-3 py-2 border-b border-slate-800 min-h-[44px] ${item.isPacked ? 'opacity-40' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          item.isPacked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-600 hover:border-slate-400'
        }`}
      >
        {item.isPacked && '✓'}
      </button>
      <span className={`text-sm flex-1 min-w-0 truncate ${item.isPacked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
        {item.name}
      </span>
      <QtyBadge qty={item.qty} onEdit={onQtyChange} compact />
      <button
        onClick={handleRemove}
        aria-label={`Remove ${item.name}`}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded bg-red-950 text-red-400 hover:bg-red-900 text-xs"
      >
        ✕
      </button>
    </div>
  )
}
