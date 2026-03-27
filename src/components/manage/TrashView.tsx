import { useStore } from '../../store'

export function TrashView() {
  const allItems = useStore(s => s.masterItems)
  const trashedItems = allItems.filter(i => i.deletedAt)
  const restoreMasterItem = useStore(s => s.restoreMasterItem)
  const permanentlyDeleteMasterItem = useStore(s => s.permanentlyDeleteMasterItem)
  const emptyTrash = useStore(s => s.emptyTrash)

  if (trashedItems.length === 0) {
    return <p className="text-sm text-slate-500">Trash is empty.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{trashedItems.length} item{trashedItems.length !== 1 && 's'} in trash</p>
        <button
          onClick={() => { if (confirm('Permanently delete all trashed items?')) emptyTrash() }}
          className="text-xs text-red-400 hover:text-red-300"
        >Empty trash</button>
      </div>
      <div className="space-y-1">
        {trashedItems.map(item => (
          <div key={item.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-2 border-b border-slate-800">
            <span className="text-sm text-slate-400">{item.name}</span>
            <span className="text-xs text-slate-600">{item.category}</span>
            <span className="flex-1" />
            <button onClick={() => restoreMasterItem(item.id)} className="text-xs text-indigo-400 hover:text-indigo-300">restore</button>
            <button onClick={() => { if (confirm(`Permanently delete "${item.name}"?`)) permanentlyDeleteMasterItem(item.id) }} className="text-xs text-red-500 hover:text-red-400">delete forever</button>
          </div>
        ))}
      </div>
    </div>
  )
}
