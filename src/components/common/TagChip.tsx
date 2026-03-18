const TAG_COLOURS: Record<string, string> = {
  always: 'bg-slate-700 text-slate-300',
  'cold-weather': 'bg-blue-900 text-blue-300',
  'warm-weather': 'bg-amber-900 text-amber-300',
  business: 'bg-violet-900 text-violet-300',
  leisure: 'bg-green-900 text-green-300',
}

export function TagChip({ tag }: { tag: string }) {
  const colour = TAG_COLOURS[tag] ?? 'bg-slate-700 text-slate-300'
  return <span className={`text-xs rounded-full px-2 py-0.5 ${colour}`}>{tag}</span>
}
