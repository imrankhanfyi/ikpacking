import { useStore } from '../../store'

export function TagsView() {
  const masterItems = useStore(s => s.masterItems).filter(i => !i.deletedAt)
  const renameTag = useStore(s => s.renameTag)

  const tagCounts = masterItems.reduce((acc, item) => {
    item.tags.forEach(t => { acc[t] = (acc[t] ?? 0) + 1 })
    return acc
  }, {} as Record<string, number>)

  function handleRename(tag: string) {
    const newName = prompt(`Rename "${tag}" to:`, tag)
    if (newName && newName !== tag) renameTag(tag, newName)
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-[#2d2d2d] mb-4">All tags</h2>
      {Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => (
        <div key={tag} className="flex items-center gap-3 py-2 border-b border-[#eee]">
          <span className="flex-1 text-sm text-[#2d2d2d]">{tag}</span>
          <span className="text-xs text-[#999] font-mono">{count} items</span>
          <button onClick={() => handleRename(tag)} className="text-xs text-[#ccc] hover:text-[#e05a33]">rename</button>
        </div>
      ))}
    </div>
  )
}
