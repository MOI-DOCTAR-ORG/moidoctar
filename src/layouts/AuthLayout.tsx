import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Navigate, useLocation, useOutlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OfflineBanner from '../components/OfflineBanner'

const authRouteOrder = [
  '/login',
  '/sign-in',
  '/sign-up',
  '/verify-email',
  '/forgot-password',
  '/age-selection',
  '/body-map',
  '/pinpoint-pain',
]

function getRouteDirection(from: string, to: string): 1 | -1 {
  const fromIndex = authRouteOrder.indexOf(from)
  const toIndex = authRouteOrder.indexOf(to)

  if (fromIndex === -1 || toIndex === -1) return 1
  return toIndex >= fromIndex ? 1 : -1
}

type AuthRouteFrame = {
  key: string
  outlet: ReactNode
}

export default function AuthLayout() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const outlet = useOutlet()
  const timeoutRef = useRef<number | null>(null)
  const [activeFrame, setActiveFrame] = useState<AuthRouteFrame>(() => ({
    key: location.pathname,
    outlet,
  }))
  const [incomingFrame, setIncomingFrame] = useState<AuthRouteFrame | null>(null)
  const [direction, setDirection] = useState<1 | -1>(1)

  useEffect(() => {
    if (location.pathname === activeFrame.key) return

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }

    const nextFrame = {
      key: location.pathname,
      outlet,
    }
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setActiveFrame(nextFrame)
      setIncomingFrame(null)
      return
    }

    setDirection(getRouteDirection(activeFrame.key, location.pathname))
    setIncomingFrame(nextFrame)

    timeoutRef.current = window.setTimeout(() => {
      setActiveFrame(nextFrame)
      setIncomingFrame(null)
      timeoutRef.current = null
    }, 420)

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [activeFrame.key, location.pathname])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const transitionStyle = {
    '--auth-route-enter-x': `${direction * 28}px`,
    '--auth-route-exit-x': `${direction * -20}px`,
  } as CSSProperties

  return (
    <div className="min-h-screen overflow-hidden bg-background text-on-background" style={transitionStyle}>
      <OfflineBanner />
      <div className="relative min-h-screen">
        <div
          key={`active-${activeFrame.key}`}
          className={incomingFrame ? 'auth-route-frame auth-route-exit' : 'auth-route-frame'}
        >
          {activeFrame.outlet}
        </div>

        {incomingFrame && (
          <div key={`incoming-${incomingFrame.key}`} className="auth-route-frame auth-route-enter">
            {incomingFrame.outlet}
          </div>
        )}
      </div>
    </div>
  )
}
