import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import { Onboarding } from './components/Onboarding'
import { TripList } from './components/trips/TripList'
import { ToastContainer } from './components/common/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { loadFromServer } from './store/sync'
import { toast, toastError } from './store/toastStore'
import { parseTokenFromHash } from './lib/connectLink'

// Lazy-loaded routes
const NewTripForm = lazy(() => import('./components/trips/NewTripForm').then(m => ({ default: m.NewTripForm })))
const PackingView = lazy(() => import('./components/packing/PackingView').then(m => ({ default: m.PackingView })))
const ManageLayout = lazy(() => import('./components/manage/ManageLayout').then(m => ({ default: m.ManageLayout })))
const MasterListView = lazy(() => import('./components/manage/MasterListView').then(m => ({ default: m.MasterListView })))
const KitsView = lazy(() => import('./components/manage/KitsView').then(m => ({ default: m.KitsView })))
const TagsView = lazy(() => import('./components/manage/TagsView').then(m => ({ default: m.TagsView })))
const ExportImport = lazy(() => import('./components/manage/ExportImport').then(m => ({ default: m.ExportImport })))
const ApiSettings = lazy(() => import('./components/manage/ApiSettings').then(m => ({ default: m.ApiSettings })))
const NotionImport = lazy(() => import('./components/manage/NotionImport').then(m => ({ default: m.NotionImport })))
const TrashView = lazy(() => import('./components/manage/TrashView').then(m => ({ default: m.TrashView })))

// Module-level flag: prevents double-firing in React StrictMode (which unmounts
// and remounts effects in dev) and also handles any second mount scenario.
let tokenHandled = false

export default function App() {
  const hasOnboarded = useStore(s => s.settings.hasCompletedOnboarding)
  const mergeMissingSeeds = useStore(s => s.mergeMissingSeeds)
  const updateSettings = useStore(s => s.updateSettings)

  // Handle #token=<value> connect links — BEFORE the early Onboarding return so
  // this fires even on fresh (un-onboarded) devices.
  useEffect(() => {
    if (tokenHandled) return
    if (typeof window === 'undefined') return

    const token = parseTokenFromHash(window.location.hash)
    if (!token) return

    // Mark handled immediately (synchronously) before any await — this is the
    // only safe place, because StrictMode re-runs effects before promises resolve.
    tokenHandled = true

    // Scrub the token from the URL so it isn't kept in browser history.
    history.replaceState(null, '', window.location.pathname + window.location.search)

    // Save the token, pull from server, then land the user in the app.
    updateSettings({ syncToken: token })
    toast('Connecting…')

    loadFromServer().then(ok => {
      if (ok) {
        toast('Synced')
        // A new device won't have onboarded — mark it done so the user lands in
        // the main app (the whole point of scanning the QR on a new device).
        updateSettings({ hasCompletedOnboarding: true })
      } else {
        toastError('Could not connect with that link')
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { mergeMissingSeeds() }, [])

  if (!hasOnboarded) return <Onboarding />

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-[#fefefe] text-[#2d2d2d]">
          <Suspense fallback={<div className="min-h-screen bg-[#fefefe] flex items-center justify-center"><p className="text-[#999] text-sm">Loading...</p></div>}>
            <Routes>
              <Route path="/" element={<TripList />} />
              <Route path="/trip/new" element={<NewTripForm />} />
              <Route path="/trip/:id" element={<PackingView />} />
              <Route path="/manage" element={<ManageLayout />}>
                <Route index element={<Navigate to="items" replace />} />
                <Route path="items" element={<MasterListView />} />
                <Route path="kits" element={<KitsView />} />
                <Route path="tags" element={<TagsView />} />
                <Route path="trash" element={<TrashView />} />
                <Route path="import" element={<NotionImport />} />
                <Route path="backup" element={<ExportImport />} />
                <Route path="api" element={<ApiSettings />} />
              </Route>
            </Routes>
          </Suspense>
        </div>
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
