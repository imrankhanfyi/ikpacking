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
      <div className="min-h-screen bg-[#fefefe] flex items-center justify-center p-6">
        <div className="max-w-md w-full space-y-6">
          <h1 className="text-2xl font-bold text-[#2d2d2d]">Add your OpenRouter key</h1>
          <p className="text-[#999]">Used for AI trip generation. Optional — you can always add it later in Settings.</p>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-or-..." className="w-full bg-white border-[1.5px] border-[#ddd] rounded px-3 py-2 text-[#2d2d2d] focus:outline-none focus:border-[#2d2d2d]" />
          <div className="flex gap-2">
            <button onClick={finish} className="flex-1 py-2 bg-[#f5f3ef] text-[#999] rounded text-sm">Skip for now</button>
            <button onClick={finish} disabled={!apiKey.trim()} className="flex-1 py-2 bg-[#2d2d2d] hover:bg-[#444] disabled:opacity-50 text-white rounded text-sm font-semibold">Save & start</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fefefe] flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <h1 className="text-3xl font-bold text-[#2d2d2d]">pack</h1>
        <p className="text-[#999]">A smarter packing list. One master list, reusable kits, AI-powered trip generation.</p>
        <div className="text-left border-[1.5px] border-[#2d2d2d] rounded p-4 space-y-2">
          <p className="text-sm text-[#2d2d2d]">✓ Master item library with tags</p>
          <p className="text-sm text-[#2d2d2d]">✓ Reusable kits (International, Gym, Hiking...)</p>
          <p className="text-sm text-[#2d2d2d]">✓ AI generates your list from a trip description</p>
          <p className="text-sm text-[#2d2d2d]">✓ Gets smarter after every trip</p>
        </div>
        <button onClick={() => setStep('api')} className="w-full py-3 bg-[#2d2d2d] hover:bg-[#444] text-white rounded font-semibold">Get started →</button>
      </div>
    </div>
  )
}
