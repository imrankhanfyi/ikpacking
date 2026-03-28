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
        <h1 className="text-2xl font-bold text-[#2d2d2d]">Trips</h1>
        <div className="flex gap-2">
          <Link to="/manage" className="font-mono text-[11px] uppercase tracking-[2px] text-[#999] border-[1.5px] border-[#ddd] rounded px-3 py-1.5">Manage</Link>
          <Link to="/trip/new" className="font-mono text-[11px] uppercase tracking-[2px] bg-[#2d2d2d] text-white rounded px-3 py-1.5">+ New trip</Link>
        </div>
      </div>

      <SuggestionBanner />

      {active.length === 0 && past.length === 0 && (
        <p className="text-[#999] text-center py-12">No trips yet. <Link to="/trip/new" className="text-[#e05a33] underline">Plan one.</Link></p>
      )}

      {active.length === 0 && past.length > 0 && (
        <p className="text-[#999] text-center py-6">All packed! <Link to="/trip/new" className="text-[#e05a33] underline">Plan your next trip.</Link></p>
      )}

      {active.length > 0 && (
        <section>
          <h2 className="font-mono text-[10px] uppercase tracking-[3px] text-[#999] mb-3">Upcoming</h2>
          <div className="space-y-2">{active.map(t => <TripCard key={t.id} trip={t} />)}</div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="font-mono text-[10px] uppercase tracking-[3px] text-[#999] mb-3">Past trips</h2>
          <div className="space-y-2">{past.map(t => <TripCard key={t.id} trip={t} />)}</div>
        </section>
      )}
    </div>
  )
}
