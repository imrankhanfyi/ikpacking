interface QtyStepper {
  qty: number
  onEdit?: (qty: number) => void
  compact?: boolean
}

export function QtyBadge({ qty, onEdit, compact }: QtyStepper) {
  if (!onEdit) {
    if (qty <= 1) return null
    return <span className="inline-block bg-[#f5f3ef] text-[#2d2d2d] text-xs font-bold font-mono rounded px-1.5 py-0.5 ml-1">×{qty}</span>
  }

  return (
    <span className="inline-flex items-center gap-1 ml-1">
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(Math.max(1, qty - 1)) }}
        aria-label="Decrease quantity"
        className={`flex items-center justify-center rounded bg-[#f5f3ef] text-[#999] hover:text-[#2d2d2d] hover:bg-[#eee8e0] ${compact ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'}`}
      >−</button>
      <span className={`text-[#2d2d2d] font-mono text-center ${compact ? 'w-4 text-xs' : 'w-6 text-xs'}`} aria-label={`Quantity: ${qty}`}>{qty}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(qty + 1) }}
        aria-label="Increase quantity"
        className={`flex items-center justify-center rounded bg-[#f5f3ef] text-[#999] hover:text-[#2d2d2d] hover:bg-[#eee8e0] ${compact ? 'w-6 h-6 text-xs' : 'w-7 h-7 text-sm'}`}
      >+</button>
    </span>
  )
}
