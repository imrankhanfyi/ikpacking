import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSync } from './store/sync'
import { whenHydrated } from './store/startup'
import { isNative } from './lib/platform'

declare const __BUILD_ID__: string

// Native shell: no page zoom. Otherwise iOS auto-zooms into small inputs on
// focus and stays zoomed, pushing the layout off-screen. Web keeps zoom.
if (isNative()) {
  document.querySelector('meta[name="viewport"]')?.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover',
  )
}

// Register service worker with build ID for cache versioning
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`/sw.js?v=${__BUILD_ID__}`)
  })
}

// Start server sync (if configured)
whenHydrated(() => { void startSync() })

// Render only after the persisted store has hydrated (async on native), so
// the UI never flashes onboarding or writes over not-yet-loaded state.
whenHydrated(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
