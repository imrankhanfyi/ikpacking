import type { Trip } from '../../types'
import { ProgressBar } from '../common/ProgressBar'
import { Link } from 'react-router-dom'

export function TripCard({ trip }: { trip: Trip }) {
  const included = trip.items.filter(i => i.isIncluded)
  const packed = included.filter(i => i.isPacked)
  const isComplete = !!trip.completedAt
  const isActive = !isComplete

  return (
    <Link to={`/trip/${trip.id}`} className="block bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-slate-100">{trip.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{trip.departureDate} · {trip.profile.duration}d · {trip.profile.weather} · {trip.profile.type}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isComplete ? 'bg-slate-800 text-slate-500' : 'bg-indigo-900 text-indigo-300'}`}>
          {isComplete ? 'done' : 'packing'}
        </span>
      </div>
      {isActive && <ProgressBar packed={packed.length} total={included.length} />}
    </Link>
  )
}
