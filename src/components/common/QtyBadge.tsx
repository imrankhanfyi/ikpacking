interface QtyBadgeProps {
  qty: number
  onEdit?: (qty: number) => void
}

export function QtyBadge({ qty, onEdit }: QtyBadgeProps) {
  if (qty <= 1) return null
  return (
    <span
      className="inline-block bg-slate-800 text-indigo-400 text-xs font-bold rounded px-1.5 py-0.5 ml-1 cursor-pointer hover:bg-slate-700"
      onClick={() => {
        if (!onEdit) return
        const val = prompt('Quantity:', String(qty))
        if (val && !isNaN(Number(val))) onEdit(Number(val))
      }}
    >
      ×{qty}
    </span>
  )
}
