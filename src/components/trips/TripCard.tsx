import type { Trip } from '../../types'
import { ProgressBar } from '../common/ProgressBar'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'

export function TripCard({ trip }: { trip: Trip }) {
  const included = trip.items.filter(i => i.isIncluded)
  const packed = included.filter(i => i.isPacked)
  const isComplete = !!trip.completedAt
  const isActive = !isComplete
  const navigate = useNavigate()
  const renameTrip = useStore(s => s.renameTrip)
  const deleteTrip = useStore(s => s.deleteTrip)

  function handleRename(e: React.MouseEvent) {
    e.stopPropagation()
    const name = prompt('Rename trip:', trip.name)
    if (name && name.trim()) renameTrip(trip.id, name.trim())
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm(`Delete "${trip.name}"?`)) deleteTrip(trip.id)
  }

  return (
    <div
      onClick={() => navigate(`/trip/${trip.id}`)}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-100 truncate">{trip.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{trip.departureDate} · {trip.profile.duration}d · {trip.profile.weather} · {trip.profile.type}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={handleRename} className="text-xs text-slate-600 hover:text-indigo-400">rename</button>
          <button onClick={handleDelete} className="text-xs text-slate-600 hover:text-red-400">del</button>
          <span className={`text-xs px-2 py-0.5 rounded-full ${isComplete ? 'bg-slate-800 text-slate-500' : 'bg-indigo-900 text-indigo-300'}`}>
            {isComplete ? 'done' : 'packing'}
          </span>
        </div>
      </div>
      {isActive && <ProgressBar packed={packed.length} total={included.length} />}
    </div>
  )
}
