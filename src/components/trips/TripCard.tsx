import { useState } from 'react'
import type { Trip } from '../../types'
import { ProgressBar } from '../common/ProgressBar'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { toastUndo } from '../../store/toastStore'

export function TripCard({ trip }: { trip: Trip }) {
  const included = trip.items.filter(i => i.isIncluded)
  const packed = included.filter(i => i.isPacked)
  const isComplete = !!trip.completedAt
  const isActive = !isComplete
  const navigate = useNavigate()
  const renameTrip = useStore(s => s.renameTrip)
  const deleteTrip = useStore(s => s.deleteTrip)
  const addTrip = useStore(s => s.addTrip)
  const duplicateTrip = useStore(s => s.duplicateTrip)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(trip.name)

  function handleRename(e: React.MouseEvent) {
    e.stopPropagation()
    setEditName(trip.name)
    setEditing(true)
  }

  function commitRename() {
    if (editName.trim() && editName.trim() !== trip.name) {
      renameTrip(trip.id, editName.trim())
    }
    setEditing(false)
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    const savedTrip = { ...trip, items: [...trip.items] }
    deleteTrip(trip.id)
    toastUndo(`"${trip.name}" deleted`, () => {
      addTrip({
        name: savedTrip.name,
        departureDate: savedTrip.departureDate,
        profile: savedTrip.profile,
        activeKitIds: savedTrip.activeKitIds,
        items: savedTrip.items,
        completedAt: savedTrip.completedAt,
      })
    })
  }

  function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation()
    const newId = duplicateTrip(trip.id)
    if (newId) navigate(`/trip/${newId}`)
  }

  return (
    <div
      onClick={() => !editing && navigate(`/trip/${trip.id}`)}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false) }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              className="w-full bg-slate-800 border border-indigo-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none"
            />
          ) : (
            <h3 className="font-semibold text-slate-100 truncate">{trip.name}</h3>
          )}
          <p className="text-xs text-slate-500 mt-0.5">{trip.departureDate} · {trip.profile.duration}d · {trip.profile.weather} · {trip.profile.type}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={handleDuplicate} className="text-xs text-slate-600 hover:text-indigo-400">copy</button>
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
