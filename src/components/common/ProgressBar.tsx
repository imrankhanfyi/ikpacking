interface ProgressBarProps {
  packed: number
  total: number
}

export function ProgressBar({ packed, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.round((packed / total) * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-[#eee] rounded-full h-1.5 overflow-hidden">
        <div className="bg-[#e05a33] h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[#999] font-mono tabular-nums">{packed} / {total}</span>
    </div>
  )
}
