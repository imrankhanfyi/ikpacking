import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { PackingColumn } from './PackingColumn'
import { LastMinuteSection } from './LastMinuteSection'
import { EssentialsGate } from './EssentialsGate'
import { computeLastMinuteItems } from '../../lib/lastMinute'
import { learnFromHistory } from '../../ai/learnFromHistory'
import { useState } from 'react'
import { CATEGORY_LAYOUT } from '../../constants'

export function PackingView() {
  const { id } = useParams<{ id: string }>()
  const trip = useStore(s => s.trips.find(t => t.id === id))
  const updateTripItem = useStore(s => s.updateTripItem)
  const addTripItem = useStore(s => s.addTripItem)
  const completeTrip = useStore(s => s.completeTrip)
  const [showGate, setShowGate] = useState(false)
  const [addingCategory, setAddingCategory] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const navigate = useNavigate()

  if (!trip) return <div className="p-6 text-[#999]">Trip not found</div>

  const liveItems = trip.items.filter(i => i.deletedAt == null)
  const included = liveItems.filter(i => i.isIncluded)
  const packed = included.filter(i => i.isPacked)
  const lastMinuteItems = computeLastMinuteItems(liveItems, trip.departureDate)

  function handleToggle(itemId: string) {
    const item = trip!.items.find(i => i.id === itemId)
    if (item) updateTripItem(trip!.id, itemId, { isPacked: !item.isPacked })
  }

  function handleQtyChange(itemId: string, qty: number) {
    updateTripItem(trip!.id, itemId, { qty })
  }

  function handleRemove(itemId: string) {
    updateTripItem(trip!.id, itemId, { isIncluded: false })
  }

  function handleRestore(itemId: string) {
    updateTripItem(trip!.id, itemId, { isIncluded: true })
  }

  function handleComplete() {
    completeTrip(trip!.id)
    navigate('/')
    // Trigger learning in background (silent fail)
    const apiKey = useStore.getState().settings.openRouterApiKey
    const completedTrips = useStore.getState().trips.filter(t => t.completedAt)
    if (apiKey && completedTrips.length >= 3) {
      learnFromHistory(apiKey, completedTrips)
        .then(suggestions => { if (suggestions.length) useStore.getState().setSuggestions(suggestions) })
        .catch(() => {})
    }
  }

  function handleAddItem(category: string) {
    if (!newItemName.trim()) return
    addTripItem(trip!.id, {
      masterItemId: null, name: newItemName.trim(), qty: 1, isIncluded: true, isPacked: false,
      isLastMinute: false, isEssential: false, category
    })
    setNewItemName('')
    setAddingCategory(null)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => navigate('/')} className="text-[#e05a33] font-mono text-[11px] uppercase tracking-[2px] hover:opacity-70 mb-1">&larr; TRIPS</button>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#2d2d2d]">{trip.name}</h1>
          <p className="font-mono text-[11px] uppercase tracking-[1px] text-[#999]">{trip.departureDate} &middot; {trip.profile.duration}d &middot; {trip.profile.weather} &middot; {trip.profile.type}</p>
        </div>
        {!trip.completedAt && (
          <button onClick={() => setShowGate(true)} className="px-4 py-2 bg-[#2a6e4e] text-white rounded font-mono text-sm font-bold hover:bg-[#1e5a3d]">Mark complete &#10003;</button>
        )}
      </div>

      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: Math.min(included.length, 20) }, (_, i) => (
          <span key={i} className={`w-3 h-3 border-[1.5px] rounded-[2px] ${i < packed.length ? 'border-[#2d2d2d] bg-[#e05a33]' : 'border-[#ddd]'}`} />
        ))}
        {included.length > 20 && <span className="font-mono text-[10px] text-[#999]">...</span>}
        <span className="ml-2 font-mono text-[10px] text-[#999]">{packed.length} / {included.length}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <PackingColumn categories={CATEGORY_LAYOUT.LEFT} items={liveItems} onToggle={handleToggle} onQtyChange={handleQtyChange} onRemove={handleRemove} onRestore={handleRestore} />
        <PackingColumn categories={CATEGORY_LAYOUT.RIGHT} items={liveItems} onToggle={handleToggle} onQtyChange={handleQtyChange} onRemove={handleRemove} onRestore={handleRestore} />
      </div>

      {included.length === 0 && (
        <p className="text-sm text-[#999] text-center py-12">This trip has no items. Go back and add some.</p>
      )}

      <div className="mt-4">
        {addingCategory ? (
          <div className="flex gap-2">
            <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddItem(addingCategory); if (e.key === 'Escape') setAddingCategory(null) }}
              placeholder="Item name..." autoFocus
              className="flex-1 bg-white border-[1.5px] border-[#ddd] rounded px-3 py-2 text-sm text-[#2d2d2d] focus:outline-none focus:border-[#2d2d2d]" />
            <button onClick={() => handleAddItem(addingCategory)} className="px-3 py-2 bg-[#2d2d2d] text-white rounded text-sm">Add</button>
            <button onClick={() => setAddingCategory(null)} className="px-3 py-2 bg-[#f5f3ef] text-[#999] rounded text-sm">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAddingCategory('Misc')} className="text-[#e05a33] font-mono text-[11px] uppercase tracking-[2px] hover:opacity-70">+ Add item</button>
        )}
      </div>

      <LastMinuteSection items={lastMinuteItems} onToggle={handleToggle} tripId={trip.id} />

      {showGate && (
        <EssentialsGate
          items={liveItems.filter(i => i.isEssential && i.isIncluded)}
          onConfirm={handleComplete}
          onClose={() => setShowGate(false)}
        />
      )}
    </div>
  )
}
