import { useStore } from '../../store'

export function ExportImport() {
  const exportData = useStore(s => s.exportData)
  const importData = useStore(s => s.importData)

  function handleExport() {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `packing-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        importData(ev.target?.result as string)
        alert('Data imported successfully.')
      } catch {
        alert('Failed to parse backup file.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Export backup</h3>
        <p className="text-xs text-slate-500 mb-3">Downloads all your master items, kits, and trip history as a JSON file.</p>
        <button onClick={handleExport} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm">Download backup</button>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Import backup</h3>
        <p className="text-xs text-slate-500 mb-3">Restores from a previously exported JSON file. This replaces all current data.</p>
        <label className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm cursor-pointer">
          Choose file <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </section>
    </div>
  )
}
