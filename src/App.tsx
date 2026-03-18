import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { TripList } from './components/trips/TripList'
import { NewTripForm } from './components/trips/NewTripForm'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Routes>
          <Route path="/" element={<TripList />} />
          <Route path="/trip/new" element={<NewTripForm />} />
          {/* Additional routes added in later tasks */}
        </Routes>
      </div>
    </BrowserRouter>
  )
}
