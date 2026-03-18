import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TripProfile, Weather, TripType, TripMode } from '../../types'
import { useStore } from '../../store'
import { generateTripItems } from '../../lib/generateTripItems'

const DEFAULT_PROFILE: TripProfile = {
  duration: 5, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: ''
}

export function NewTripForm() {
  const [profile, setProfile] = useState<TripProfile>(DEFAULT_PROFILE)
  const [name, setName] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [step, setStep] = useState<'form' | 'kits' | 'review'>('form')
  const masterItems = useStore(s => s.masterItems)
  const kits = useStore(s => s.kits)
  const addTrip = useStore(s => s.addTrip)
  const navigate = useNavigate()

  const [generatedItems, setGeneratedItems] = useState(() => generateTripItems(masterItems, DEFAULT_PROFILE))
  const [activeKitIds, setActiveKitIds] = useState<string[]>([])

  function handleGenerate() {
    setGeneratedItems(generateTripItems(masterItems, profile))
    setStep('kits')
  }

  function handleSave() {
    const id = addTrip({ name: name || `Trip ${departureDate}`, departureDate, profile, activeKitIds, items: generatedItems, completedAt: null })
    navigate(`/trip/${id}`)
  }

  if (step === 'kits') {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Suggested kits</h2>
        <p className="text-sm text-slate-400">Add any kits relevant to this trip.</p>
        {kits.map(kit => (
          <div key={kit.id} className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl p-4">
            <div>
              <p className="font-medium text-slate-200">{kit.name}</p>
              <p className="text-xs text-slate-500">{kit.items.length} items</p>
            </div>
            <button
              onClick={() => setActiveKitIds(ids => ids.includes(kit.id) ? ids.filter(i => i !== kit.id) : [...ids, kit.id])}
              className={`px-3 py-1 text-sm rounded-lg ${activeKitIds.includes(kit.id) ? 'bg-green-800 text-green-300' : 'bg-slate-800 text-slate-400'}`}
            >
              {activeKitIds.includes(kit.id) ? '✓ Added' : '+ Add'}
            </button>
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          <button onClick={() => setStep('form')} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400">← Back</button>
          <button onClick={() => setStep('review')} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white">Review list →</button>
        </div>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="max-w-lg mx-auto p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Review your list</h2>
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {generatedItems.filter(i => i.isIncluded).map(item => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-slate-800">
              <span className="text-slate-200">{item.name}{item.qty > 1 && <span className="ml-1 text-xs bg-slate-800 text-indigo-400 px-1.5 py-0.5 rounded">×{item.qty}</span>}</span>
              <button onClick={() => setGeneratedItems(items => items.map(i => i.id === item.id ? { ...i, isIncluded: false } : i))} className="text-xs text-slate-600 hover:text-red-400">remove</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={() => setStep('kits')} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400">← Back</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-indigo-600 text-white font-semibold">Save trip →</button>
        </div>
      </div>
    )
  }

  // step === 'form'
  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h2 className="text-xl font-bold text-slate-100">New trip</h2>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Trip name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Edinburgh Mar 26" className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
      </div>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Departure date</label>
        <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
      </div>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Duration (days)</label>
        <input type="number" min={1} max={90} value={profile.duration} onChange={e => setProfile(p => ({ ...p, duration: Number(e.target.value) }))} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
      </div>

      {[
        { label: 'Weather', key: 'weather', options: ['cold', 'warm', 'mixed'] },
        { label: 'Type', key: 'type', options: ['business', 'leisure', 'mixed'] },
        { label: 'Mode', key: 'mode', options: ['checked', 'carry-on', 'road-trip'] },
      ].map(({ label, key, options }) => (
        <div key={key}>
          <label className="text-xs text-slate-400 uppercase tracking-wider">{label}</label>
          <div className="flex gap-2 mt-1">
            {options.map(opt => (
              <button key={opt} onClick={() => setProfile(p => ({ ...p, [key]: opt }))}
                className={`flex-1 py-1.5 rounded-lg text-sm capitalize ${(profile as any)[key] === opt ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >{opt}</button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleGenerate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Generate list →</button>
    </div>
  )
}
