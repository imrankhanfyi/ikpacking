import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useStore } from './store'
import { Onboarding } from './components/Onboarding'
import { TripList } from './components/trips/TripList'
import { NewTripForm } from './components/trips/NewTripForm'
import { PackingView } from './components/packing/PackingView'
import { ManageLayout } from './components/manage/ManageLayout'
import { MasterListView } from './components/manage/MasterListView'
import { KitsView } from './components/manage/KitsView'
import { TagsView } from './components/manage/TagsView'
import { ExportImport } from './components/manage/ExportImport'
import { ApiSettings } from './components/manage/ApiSettings'
import { NotionImport } from './components/manage/NotionImport'
import { TrashView } from './components/manage/TrashView'
import { ToastContainer } from './components/common/Toast'

export default function App() {
  const hasOnboarded = useStore(s => s.settings.hasCompletedOnboarding)
  const mergeMissingSeeds = useStore(s => s.mergeMissingSeeds)

  useEffect(() => { mergeMissingSeeds() }, [])

  if (!hasOnboarded) return <Onboarding />

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Routes>
          <Route path="/" element={<TripList />} />
          <Route path="/trip/new" element={<NewTripForm />} />
          <Route path="/trip/:id" element={<PackingView />} />
          <Route path="/manage" element={<ManageLayout />}>
            <Route path="items" element={<MasterListView />} />
            <Route path="kits" element={<KitsView />} />
            <Route path="tags" element={<TagsView />} />
            <Route path="trash" element={<TrashView />} />
            <Route path="import" element={<NotionImport />} />
            <Route path="backup" element={<ExportImport />} />
            <Route path="api" element={<ApiSettings />} />
          </Route>
        </Routes>
      </div>
      <ToastContainer />
    </BrowserRouter>
  )
}
