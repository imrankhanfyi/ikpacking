import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store'
import { Onboarding } from './components/Onboarding'
import { TripList } from './components/trips/TripList'
import { ToastContainer } from './components/common/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'

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

export default function App() {
  const hasOnboarded = useStore(s => s.settings.hasCompletedOnboarding)
  const mergeMissingSeeds = useStore(s => s.mergeMissingSeeds)

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
