import { useState } from 'react'
import { useStore } from '../store'

export function Onboarding() {
  const updateSettings = useStore(s => s.updateSettings)
  const [apiKey, setApiKey] = useState('')
  const [step, setStep] = useState<'welcome' | 'api'>('welcome')

  function finish() {
    updateSettings({ openRouterApiKey: apiKey, hasCompletedOnboarding: true })
  }

  if (step === 'api') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <h1 className="text-2xl font-bold text-slate-100">Add your OpenRouter key</h1>
          <p className="text-slate-400">Used for AI trip generation. Optional — you can always add it later in Settings.</p>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-or-..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500" />
          <div className="flex gap-2">
            <button onClick={finish} className="flex-1 py-2 bg-slate-800 text-slate-400 rounded-lg text-sm">Skip for now</button>
            <button onClick={finish} disabled={!apiKey.trim()} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold">Save & start</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold text-slate-100">Pack</h1>
        <p className="text-slate-400">A smarter packing list. One master list, reusable kits, AI-powered trip generation.</p>
        <div className="text-left bg-slate-900 rounded-xl p-4 space-y-2">
          <p className="text-sm text-slate-300">✓ Master item library with tags</p>
          <p className="text-sm text-slate-300">✓ Reusable kits (International, Gym, Hiking...)</p>
          <p className="text-sm text-slate-300">✓ AI generates your list from a trip description</p>
          <p className="text-sm text-slate-300">✓ Gets smarter after every trip</p>
        </div>
        <button onClick={() => setStep('api')} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold">Get started →</button>
      </div>
    </div>
  )
}
