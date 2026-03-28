import { useStore } from '../../store'

export function TrashView() {
  const trashedItems = useStore(s => s.masterItems).filter(i => i.deletedAt)
  const restoreMasterItem = useStore(s => s.restoreMasterItem)
  const permanentlyDeleteMasterItem = useStore(s => s.permanentlyDeleteMasterItem)
  const emptyTrash = useStore(s => s.emptyTrash)

  if (trashedItems.length === 0) {
    return <p className="text-sm text-[#999]">Trash is empty.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#999]">{trashedItems.length} item{trashedItems.length !== 1 && 's'} in trash</p>
        <button
          onClick={() => { if (confirm('Permanently delete all trashed items?')) emptyTrash() }}
          className="text-[#e05a33] font-mono text-[10px] uppercase"
        >Empty trash</button>
      </div>
      <div className="space-y-1">
        {trashedItems.map(item => (
          <div key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 border-b border-[#eee]">
            <span className="text-sm text-[#999]">{item.name}</span>
            <span className="font-mono text-[10px] text-[#ccc]">{item.category}</span>
            <span className="flex-1" />
            <button onClick={() => restoreMasterItem(item.id)} className="text-[#2a6e4e] font-mono text-[10px]">restore</button>
            <button onClick={() => { if (confirm(`Permanently delete "${item.name}"?`)) permanentlyDeleteMasterItem(item.id) }} className="text-[#e05a33] font-mono text-[10px]">delete forever</button>
          </div>
        ))}
      </div>
    </div>
  )
}
