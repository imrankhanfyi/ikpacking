import { TAG_COLORS } from '../../constants'

export function TagChip({ tag }: { tag: string }) {
  const colour = TAG_COLORS[tag] ?? 'bg-[#f5f3ef] text-[#999] border border-[#ddd]'
  return <span className={`text-xs rounded-full px-2 py-0.5 border ${colour}`}>{tag}</span>
}
