import { useStore } from '../../store'

export function SuggestionBanner() {
  const suggestions = useStore(s => s.pendingSuggestions)
  const dismiss = useStore(s => s.dismissSuggestion)

  if (suggestions.length === 0) return null

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Patterns noticed</h3>
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-3">
          <p className="flex-1 text-sm text-slate-300">{s.message} <span className="text-slate-500">({s.tripCount} trips)</span></p>
          <button onClick={() => dismiss(i)} className="text-xs text-slate-600 hover:text-slate-400 flex-shrink-0">dismiss</button>
        </div>
      ))}
    </div>
  )
}
