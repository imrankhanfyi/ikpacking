import { useState } from 'react'
import type { Trip } from '../../types'
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
      className={`border-[1.5px] rounded p-4 transition-colors cursor-pointer relative ${isComplete ? 'border-[#ddd]' : 'border-[#2d2d2d] hover:border-[#e05a33]'}`}
    >
      {/* Status badge */}
      <span className={`absolute top-[-1px] right-3 font-mono text-[9px] font-bold tracking-[1px] px-2 py-0.5 ${isComplete ? 'bg-[#2a6e4e] text-white' : 'bg-[#e05a33] text-white'}`}>
        {isComplete ? 'DONE' : 'PACKING'}
      </span>

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
              className="w-full bg-white border-[1.5px] border-[#2d2d2d] rounded px-2 py-1 text-sm text-[#2d2d2d] focus:outline-none"
            />
          ) : (
            <h3 className={`font-bold tracking-tight truncate ${isComplete ? 'text-[#999]' : 'text-[#2d2d2d]'}`}>{trip.name}</h3>
          )}
          <p className="font-mono text-[11px] uppercase tracking-[1px] text-[#999] mt-0.5">{trip.departureDate} · {trip.profile.duration}d · {trip.profile.weather} · {trip.profile.type}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <button onClick={handleDuplicate} className="font-mono text-[10px] uppercase tracking-[1px] text-[#ccc] hover:text-[#e05a33]">copy</button>
          <button onClick={handleRename} className="font-mono text-[10px] uppercase tracking-[1px] text-[#ccc] hover:text-[#e05a33]">rename</button>
          <button onClick={handleDelete} className="font-mono text-[10px] uppercase tracking-[1px] text-[#ccc] hover:text-[#e05a33]">del</button>
        </div>
      </div>
      {isActive && (
        <div className="flex items-center gap-1 mt-2">
          {Array.from({ length: included.length }, (_, i) => (
            <span key={i} className={`w-3 h-3 border-[1.5px] rounded-[2px] ${i < packed.length ? 'border-[#2d2d2d] bg-[#e05a33]' : 'border-[#ddd]'}`} />
          ))}
          <span className="ml-2 font-mono text-[10px] text-[#999]">{packed.length} / {included.length}</span>
        </div>
      )}
    </div>
  )
}
