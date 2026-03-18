import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TripList } from './components/trips/TripList'
import { NewTripForm } from './components/trips/NewTripForm'
import { PackingView } from './components/packing/PackingView'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Routes>
          <Route path="/" element={<TripList />} />
          <Route path="/trip/new" element={<NewTripForm />} />
          <Route path="/trip/:id" element={<PackingView />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
