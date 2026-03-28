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
    <div className={`flex items-center gap-3 py-2 border-b border-[#eee] min-h-[44px] ${item.isPacked ? 'opacity-40' : ''}`}>
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-[2px] border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${
          item.isPacked ? 'bg-[#2d2d2d] border-[#2d2d2d] text-white' : 'border-[#ddd] hover:border-[#2d2d2d]'
        }`}
      >
        {item.isPacked && '✓'}
      </button>
      <span className={`text-sm flex-1 min-w-0 truncate ${item.isPacked ? 'line-through text-[#ccc]' : 'text-[#2d2d2d]'}`}>
        {item.name}
      </span>
      <QtyBadge qty={item.qty} onEdit={onQtyChange} compact />
      <button
        onClick={handleRemove}
        aria-label={`Remove ${item.name}`}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-[2px] border-[1.5px] border-[#eee] text-[#ccc] hover:border-[#e05a33] hover:text-[#e05a33] text-xs"
      >
        ✕
      </button>
    </div>
  )
}
