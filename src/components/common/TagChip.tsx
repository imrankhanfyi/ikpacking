import { TAG_COLORS } from '../../constants'

export function TagChip({ tag }: { tag: string }) {
  const colour = TAG_COLORS[tag] ?? 'bg-slate-700 text-slate-300'
  return <span className={`text-xs rounded-full px-2 py-0.5 ${colour}`}>{tag}</span>
}
