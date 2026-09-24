import { Navigate } from 'react-router-dom'

// The pinpoint screen duplicated the body map; both are now one screen at /body-map.
export default function PinpointPain() {
  return <Navigate to="/body-map" replace />
}
