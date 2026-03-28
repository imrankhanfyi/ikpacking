import { useStore } from '../../store'
import { TripCard } from './TripCard'
import { Link } from 'react-router-dom'
import { SuggestionBanner } from './SuggestionBanner'

export function TripList() {
  const trips = useStore(s => s.trips)
  const active = trips.filter(t => !t.completedAt).sort((a, b) => a.departureDate.localeCompare(b.departureDate))
  const past = trips.filter(t => t.completedAt).sort((a, b) => b.departureDate.localeCompare(a.departureDate))

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Trips</h1>
        <div className="flex gap-2">
          <Link to="/manage" className="text-sm text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700">Manage</Link>
          <Link to="/trip/new" className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg">+ New trip</Link>
        </div>
      </div>

      <SuggestionBanner />

      {active.length === 0 && past.length === 0 && (
        <p className="text-slate-500 text-center py-12">No trips yet. <Link to="/trip/new" className="text-indigo-400 underline">Plan one.</Link></p>
      )}

      {active.length === 0 && past.length > 0 && (
        <p className="text-slate-500 text-center py-6">All packed! <Link to="/trip/new" className="text-indigo-400 underline">Plan your next trip.</Link></p>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Upcoming</h2>
          <div className="space-y-2">{active.map(t => <TripCard key={t.id} trip={t} />)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Past trips</h2>
          <div className="space-y-2">{past.map(t => <TripCard key={t.id} trip={t} />)}</div>
        </section>
      )}
    </div>
  )
}
