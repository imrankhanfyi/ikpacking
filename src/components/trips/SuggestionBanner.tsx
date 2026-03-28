import { useStore } from '../../store'

export function SuggestionBanner() {
  const suggestions = useStore(s => s.pendingSuggestions)
  const dismiss = useStore(s => s.dismissSuggestion)

  if (suggestions.length === 0) return null

  return (
    <div className="border-[1.5px] border-[#2d2d2d] rounded p-4 space-y-2">
      <h3 className="font-mono text-[10px] uppercase tracking-[3px] text-[#999]">Patterns noticed</h3>
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          <p className="flex-1 text-sm text-[#2d2d2d]">{s.message} <span className="text-[#999]">({s.tripCount} trips)</span></p>
          <button onClick={() => dismiss(i)} className="text-[#ccc] hover:text-[#e05a33] font-mono text-[10px] uppercase flex-shrink-0">dismiss</button>
        </div>
      ))}
    </div>
  )
}
