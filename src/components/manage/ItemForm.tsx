import { useState } from 'react'
import { useStore } from '../../store'
import type { MasterItem } from '../../types'
import { Modal } from '../common/Modal'

const CATEGORIES = ['Toiletries', 'Meds', 'Clothing', 'Electronics', 'Misc']
const COMMON_TAGS = ['always', 'cold-weather', 'warm-weather', 'business', 'leisure']

export function ItemForm({ item, onClose }: { item: MasterItem | null; onClose: () => void }) {
  const addMasterItem = useStore(s => s.addMasterItem)
  const updateMasterItem = useStore(s => s.updateMasterItem)

  const [nameError, setNameError] = useState(false)

  const [form, setForm] = useState({
    name: item?.name ?? '',
    category: item?.category ?? 'Misc',
    tags: item?.tags ?? ['always'],
    defaultQty: item?.defaultQty ?? 1,
    qtyBasis: item?.qtyBasis ?? 'fixed' as const,
    isLastMinute: item?.isLastMinute ?? false,
    isEssential: item?.isEssential ?? false,
  })

  function handleSave() {
    if (!form.name.trim()) { setNameError(true); return }
    setNameError(false)
    if (item) updateMasterItem(item.id, form)
    else addMasterItem(form)
    onClose()
  }

  function toggleTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag] }))
  }

  return (
    <Modal title={item ? 'Edit item' : 'Add item'} onClose={onClose}>
      <div className="space-y-3">
        <input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setNameError(false) }} placeholder="Item name" className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 ${nameError ? 'border-red-500' : 'border-slate-700'}`} />
        {nameError && <p className="text-xs text-red-400">Name is required</p>}

        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        <div>
          <p className="text-xs text-slate-500 mb-1">Tags</p>
          <div className="flex flex-wrap gap-1">
            {COMMON_TAGS.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)}
                className={`text-xs px-2 py-1 rounded-full ${form.tags.includes(tag) ? 'bg-indigo-700 text-indigo-200' : 'bg-slate-700 text-slate-400'}`}
              >{tag}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input type="number" min={1} value={form.defaultQty} onChange={e => setForm(f => ({ ...f, defaultQty: Number(e.target.value) }))} className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none" />
          <select value={form.qtyBasis} onChange={e => setForm(f => ({ ...f, qtyBasis: e.target.value as 'fixed' | 'per-day' }))} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none">
            <option value="fixed">fixed quantity</option>
            <option value="per-day">per day (×duration)</option>
          </select>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.isLastMinute} onChange={e => setForm(f => ({ ...f, isLastMinute: e.target.checked }))} className="rounded" />
            Last-minute
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={form.isEssential} onChange={e => setForm(f => ({ ...f, isEssential: e.target.checked }))} className="rounded" />
            Essential
          </label>
        </div>

        <button onClick={handleSave} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold">Save</button>
      </div>
    </Modal>
  )
}
