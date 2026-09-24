import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import AuthLayout from './layouts/AuthLayout'
import Dashboard from './pages/Dashboard'
import NewTriage from './pages/NewTriage'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import OtpVerification from './pages/OtpVerification'
import AgeSelection from './pages/AgeSelection'
import BodyMap from './pages/BodyMap'
import PinpointPain from './pages/PinpointPain'
import History from './pages/History'
import CareDetails from './pages/CareDetails'
import SymptomTracker from './pages/SymptomTracker'
import MedicationTracker from './pages/MedicationTracker'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import NewTriageInterface from './pages/NewTriageInterface'
import NewTriageBodyMap from './pages/NewTriageBodyMap'
import SymptomTrackerBodyMap from './pages/SymptomTrackerBodyMap'
import AdminCache from './pages/AdminCache'
import AISettings from './pages/AISettings'
import NotFound from './pages/NotFound'
import ForgotPassword from './pages/ForgotPassword'
import LocalCareDiscovery from './pages/LocalCareDiscovery'
import Landing from './pages/Landing'

export default function App() {
  return (
    <Routes>
      {/* Public landing page - redirects to /dashboard automatically if already signed in */}
      <Route path="/" element={<Landing />} />

      {/* Auth pages - no sidebar, redirect to app if authenticated */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<SignIn />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/verify-email" element={<OtpVerification />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      {/* App pages - with sidebar, require auth */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/new-triage" element={<NewTriage />} />
        <Route path="/new_triage" element={<NewTriage />} />
        <Route path="/age-selection" element={<AgeSelection />} />
        <Route path="/body-map" element={<BodyMap />} />
        <Route path="/pinpoint-pain" element={<PinpointPain />} />
        <Route path="/history" element={<History />} />
        <Route path="/care-details" element={<CareDetails />} />
        <Route path="/local-care" element={<LocalCareDiscovery />} />
        <Route path="/symptom-tracker" element={<SymptomTracker />} />
        <Route path="/medication-tracker" element={<MedicationTracker />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/new-triage-interface" element={<NewTriageInterface />} />
        <Route path="/new-triage-body-map" element={<NewTriageBodyMap />} />
        <Route path="/symptom-tracker-body-map" element={<SymptomTrackerBodyMap />} />
        <Route path="/ai-settings" element={<AISettings />} />
        <Route path="/admin/cache" element={<AdminCache />} />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
