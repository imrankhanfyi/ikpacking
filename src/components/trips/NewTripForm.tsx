import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TripProfile } from '../../types'
import { useStore } from '../../store'
import { generateTripItems } from '../../lib/generateTripItems'
import { parseTripDescription } from '../../ai/parseTrip'

const DEFAULT_PROFILE: TripProfile = {
  duration: 5, weather: 'cold', type: 'leisure', mode: 'checked', nlDescription: ''
}

export function NewTripForm() {
  const [profile, setProfile] = useState<TripProfile>(DEFAULT_PROFILE)
  const [name, setName] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [step, setStep] = useState<'form' | 'kits' | 'review'>('form')
  const masterItems = useStore(s => s.getActiveItems())
  const kits = useStore(s => s.kits)
  const addTrip = useStore(s => s.addTrip)
  const navigate = useNavigate()
  const settings = useStore(s => s.settings)
  const [nlInput, setNlInput] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [aiError, setAiError] = useState('')

  const [generatedItems, setGeneratedItems] = useState(() => generateTripItems(masterItems, DEFAULT_PROFILE))
  const [activeKitIds, setActiveKitIds] = useState<string[]>([])

  async function handleNlSubmit() {
    if (!nlInput.trim() || !settings.openRouterApiKey) return
    setNlLoading(true)
    setAiError('')
    try {
      const parsed = await parseTripDescription(settings.openRouterApiKey, nlInput)
      const items = generateTripItems(masterItems, parsed)
      setProfile({ duration: parsed.duration, weather: parsed.weather, type: parsed.type, mode: parsed.mode, nlDescription: nlInput })
      setName(parsed.name)
      setGeneratedItems(items)
      setStep('kits')
    } catch (e: any) {
      setAiError(e.message || 'AI parsing failed. Fill in manually below.')
    } finally {
      setNlLoading(false)
    }
  }

  function handleGenerate() {
    const errs: Record<string, string> = {}
    if (!name.trim() && !nlInput.trim()) errs.name = 'Trip name is required'
    if (!departureDate) errs.date = 'Departure date is required'
    if (profile.duration < 1) errs.duration = 'Duration must be at least 1 day'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    const items = generateTripItems(masterItems, profile)
    setGeneratedItems(items)
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
        {kits.filter(kit => kit.items.length > 0).map(kit => (
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
    const included = generatedItems.filter(i => i.isIncluded)
    const byCategory = included.reduce((acc, item) => {
      acc[item.category] = [...(acc[item.category] ?? []), item]
      return acc
    }, {} as Record<string, typeof included>)

    return (
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h2 className="text-xl font-bold text-slate-100">Review your list</h2>
        {Object.entries(byCategory).map(([cat, items]) => (
          <section key={cat}>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">{cat}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-slate-800">
                  <span className="text-sm text-slate-200 truncate">{item.name}</span>
                  <div className="ml-2 shrink-0 flex items-center gap-1.5">
                    <button onClick={() => setGeneratedItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-slate-200 text-sm">−</button>
                    <span className="text-xs text-indigo-400 w-6 text-center">{item.qty}</span>
                    <button onClick={() => setGeneratedItems(prev => prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i))} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 text-slate-400 hover:text-slate-200 text-sm">+</button>
                    <button onClick={() => setGeneratedItems(prev => prev.map(i => i.id === item.id ? { ...i, isIncluded: false } : i))} className="ml-1 px-2 py-1 rounded bg-red-950 text-red-400 hover:bg-red-900 text-xs">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
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

      {settings.openRouterApiKey && (
        <div>
          <label className="text-xs text-slate-400 uppercase tracking-wider">Describe your trip</label>
          <textarea
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            placeholder="5 days in Edinburgh, cold, one work dinner, carry-on..."
            rows={2}
            className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
          />
          <button onClick={handleNlSubmit} disabled={nlLoading || !nlInput.trim()}
            className="mt-1 w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold"
          >{nlLoading ? 'Generating...' : 'Generate from description →'}</button>
          {aiError && (
            <div className="text-sm text-red-400 bg-red-950/50 rounded-lg px-3 py-2">
              {aiError}
              <button onClick={handleNlSubmit} className="ml-2 text-indigo-400 hover:text-indigo-300 underline">Try again</button>
            </div>
          )}
          <p className="text-xs text-slate-600 mt-1 text-center">or fill in manually below</p>
        </div>
      )}

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Trip name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Edinburgh Mar 26" className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
        {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Departure date</label>
        <input type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
        {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
      </div>

      <div>
        <label className="text-xs text-slate-400 uppercase tracking-wider">Duration (days)</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={profile.duration === 0 ? '' : String(profile.duration)}
          onChange={e => {
            const raw = e.target.value.replace(/[^0-9]/g, '')
            const n = raw === '' ? 0 : Math.min(parseInt(raw, 10), 90)
            setProfile(p => ({ ...p, duration: n }))
          }}
          onBlur={() => { if (profile.duration < 1) setProfile(p => ({ ...p, duration: 1 })) }}
          placeholder="5"
          className="w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
        />
        {errors.duration && <p className="text-xs text-red-400 mt-1">{errors.duration}</p>}
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

      <button onClick={handleGenerate} disabled={!name.trim() || !departureDate || profile.duration < 1} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold">Generate list →</button>
    </div>
  )
}
