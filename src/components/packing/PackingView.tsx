import { useParams, useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { ProgressBar } from '../common/ProgressBar'
import { PackingColumn } from './PackingColumn'
import { LastMinuteSection } from './LastMinuteSection'
import { EssentialsGate } from './EssentialsGate'
import { computeLastMinuteItems } from '../../lib/lastMinute'
import { learnFromHistory } from '../../ai/learnFromHistory'
import { useState } from 'react'

const LEFT_CATS = ['Toiletries', 'Meds', 'Electronics']
const RIGHT_CATS = ['Clothing', 'Misc']

export function PackingView() {
  const { id } = useParams<{ id: string }>()
  const trip = useStore(s => s.trips.find(t => t.id === id))
  const updateTripItem = useStore(s => s.updateTripItem)
  const removeTripItem = useStore(s => s.removeTripItem)
  const addTripItem = useStore(s => s.addTripItem)
  const completeTrip = useStore(s => s.completeTrip)
  const [showGate, setShowGate] = useState(false)
  const navigate = useNavigate()

  if (!trip) return <div className="p-6 text-slate-400">Trip not found</div>

  const included = trip.items.filter(i => i.isIncluded)
  const packed = included.filter(i => i.isPacked)
  const lastMinuteItems = computeLastMinuteItems(trip.items, trip.departureDate)

  function handleToggle(itemId: string) {
    const item = trip!.items.find(i => i.id === itemId)
    if (item) updateTripItem(trip!.id, itemId, { isPacked: !item.isPacked })
  }

  function handleQtyChange(itemId: string, qty: number) {
    updateTripItem(trip!.id, itemId, { qty })
  }

  function handleRemove(itemId: string) {
    removeTripItem(trip!.id, itemId)
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
    const name = prompt('Item name:')
    if (!name) return
    addTripItem(trip!.id, {
      masterItemId: null, name, qty: 1, isIncluded: true, isPacked: false,
      isLastMinute: false, isEssential: false, category
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <button onClick={() => navigate('/')} className="text-xs text-slate-500 hover:text-slate-300 mb-1">← Trips</button>
          <h1 className="text-xl font-bold text-slate-100">{trip.name}</h1>
          <p className="text-xs text-slate-500">{trip.departureDate} · {trip.profile.duration}d · {trip.profile.weather} · {trip.profile.type}</p>
        </div>
        {!trip.completedAt && (
          <button onClick={() => setShowGate(true)} className="px-4 py-2 bg-green-800 text-green-300 rounded-lg text-sm font-semibold hover:bg-green-700">Mark complete ✓</button>
        )}
      </div>

      <div className="mb-4"><ProgressBar packed={packed.length} total={included.length} /></div>

      <div className="grid grid-cols-2 gap-6">
        <PackingColumn categories={LEFT_CATS} items={trip.items} onToggle={handleToggle} onQtyChange={handleQtyChange} onRemove={handleRemove} />
        <PackingColumn categories={RIGHT_CATS} items={trip.items} onToggle={handleToggle} onQtyChange={handleQtyChange} onRemove={handleRemove} />
      </div>

      <div className="mt-4">
        <button onClick={() => handleAddItem('Misc')} className="text-sm text-indigo-400 hover:text-indigo-300">+ Add item</button>
      </div>

      <LastMinuteSection items={lastMinuteItems} onToggle={handleToggle} tripId={trip.id} />

      {showGate && (
        <EssentialsGate
          items={trip.items.filter(i => i.isEssential && i.isIncluded)}
          onConfirm={handleComplete}
          onClose={() => setShowGate(false)}
        />
      )}
    </div>
  )
}
