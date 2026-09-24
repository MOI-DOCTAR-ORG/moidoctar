import { Navigate } from 'react-router-dom'

// The two triage chat screens were duplicates; both now use the shared chat at /new-triage.
export default function NewTriageInterface() {
  return <Navigate to="/new-triage" replace />
}
