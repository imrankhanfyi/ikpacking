import { useStore } from '../../store'
import { toast, toastError } from '../../store/toastStore'

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
        toast('Data imported successfully.')
      } catch {
        toastError('Failed to parse backup file.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-[#2d2d2d] mb-2">Export backup</h3>
        <p className="text-xs text-[#999] mb-3">Downloads all your master items, kits, and trip history as a JSON file.</p>
        <button onClick={handleExport} className="px-4 py-2 border-[1.5px] border-[#ddd] text-[#2d2d2d] hover:border-[#2d2d2d] rounded text-sm">Download backup</button>
      </section>
      <section>
        <h3 className="text-sm font-semibold text-[#2d2d2d] mb-2">Import backup</h3>
        <p className="text-xs text-[#999] mb-3">Restores from a previously exported JSON file. This replaces all current data.</p>
        <label className="px-4 py-2 border-[1.5px] border-[#ddd] text-[#2d2d2d] hover:border-[#2d2d2d] rounded text-sm cursor-pointer">
          Choose file <input type="file" accept=".json" onChange={handleImport} className="hidden" />
        </label>
      </section>
    </div>
  )
}
