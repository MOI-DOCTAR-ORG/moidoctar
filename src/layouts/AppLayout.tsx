import { useState, useEffect } from 'react'
import { Link, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import OfflineBanner from '../components/OfflineBanner'
import SafetyDisclaimer, { hasAcceptedDisclaimer } from '../components/SafetyDisclaimer'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Icon from '../components/Icon'

const pageTitles = [
  { path: '/new-triage-interface', label: 'New Triage' },
  { path: '/new-triage-body-map', label: 'New Triage' },
  { path: '/body-map', label: 'Body Map' },
  { path: '/age-selection', label: 'Age Range' },
  { path: '/symptom-tracker-body-map', label: 'Symptom Tracker' },
  { path: '/new-triage', label: 'New Triage' },
  { path: '/history', label: 'History' },
  { path: '/care-details', label: 'Care Details' },
  { path: '/local-care', label: 'Nearby Care' },
  { path: '/symptom-tracker', label: 'Symptom Tracker' },
  { path: '/medication-tracker', label: 'Medications' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/profile', label: 'Profile' },
  { path: '/ai-settings', label: 'AI Settings' },
]

function getPageTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard'
  return pageTitles.find(page => pathname.startsWith(page.path))?.label || 'MoiDoctar'
}

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) || []
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return `${parts[0][0].toUpperCase()}${parts[parts.length - 1][0].toUpperCase()}`
}

export default function AppLayout() {
  const { isAuthenticated, isLoading, signOut, user, userChangeKey } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(hasAcceptedDisclaimer())
  const isDark = theme === 'dark'
  // The chat owns the full screen height on phones (its own input bar replaces the bottom nav).
  const isChat = pathname.startsWith('/new-triage')
  const pageTitle = getPageTitle(pathname)

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in')
    setSidebarOpen(false)
  }

  if (isLoading) return <LoadingSpinner text="Verifying session..." />
  if (!isAuthenticated) return <Navigate to="/sign-in" replace />

  if (!disclaimerAccepted) {
    return <SafetyDisclaimer onAccept={() => setDisclaimerAccepted(true)} />
  }

  return (
    <div className="min-h-screen bg-background text-on-background font-body-md">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="fixed top-0 left-0 right-0 md:left-[var(--spacing-sidebar-width,232px)] z-30">

        {/* Glass header */}
        <div className="bg-surface border-b border-outline-variant h-14 md:h-16">
          <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-3 sm:px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 shrink-0 place-items-center rounded-xl bg-primary-container text-primary md:hidden transition-colors hover:bg-primary-container/80"
                aria-label="Open sidebar"
              >
                <Icon icon="menu" size="lg" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-headline-md text-lg headline-lg-mobile md:text-xl font-bold text-on-surface">
                  {pageTitle}
                </h1>
                <p className="hidden truncate text-xs font-semibold text-secondary md:block">
                  MoiDoctar health workspace
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 place-items-center rounded-xl text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <Icon icon={isDark ? 'light_mode' : 'dark_mode'} size="lg" />
              </button>
              <Link
                to="/notifications"
                className="grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 place-items-center rounded-xl text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Notifications"
              >
                <Icon icon="notifications" size="lg" />
              </Link>
              <Link
                to="/profile"
                className="grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 place-items-center rounded-xl bg-primary-container text-sm font-bold text-primary transition hover:ring-2 hover:ring-primary/30"
                aria-label="Profile"
                title={user?.userName || 'Profile'}
              >
                {getInitials(user?.userName)}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 place-items-center rounded-xl text-secondary transition-colors hover:bg-error-container hover:text-error"
                aria-label="Sign out"
              >
                <Icon icon="logout" size="lg" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <OfflineBanner />

      {/* Content */}
      <div className={`md:ml-[var(--spacing-sidebar-width,232px)] pt-14 md:pt-16 ${isChat ? 'pb-0' : 'pb-[calc(4rem+env(safe-area-inset-bottom))]'} md:pb-0 min-h-[100dvh]`}>
        <Outlet key={userChangeKey} />
      </div>

      {!isChat && <MobileBottomNav />}
    </div>
  )
}
