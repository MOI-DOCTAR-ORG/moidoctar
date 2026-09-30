import { useState, useEffect } from 'react'
import { Link, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import MobileBottomNav from '../components/MobileBottomNav'
import OfflineBanner from '../components/OfflineBanner'
import SafetyDisclaimer, { hasAcceptedDisclaimer } from '../components/SafetyDisclaimer'
import OnboardingTour, { hasCompletedTour, REPLAY_TOUR_EVENT } from '../components/OnboardingTour'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Icon from '../components/Icon'
import { getDisplayName, getInitials, getProfileImage } from '../lib/userIdentity'

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
  { path: '/ai-settings', label: 'Assistant Settings' },
  { path: '/theme', label: 'Theme' },
  { path: '/support', label: 'Support' },
]

function getPageTitle(pathname: string) {
  if (pathname === '/dashboard') return 'Dashboard'
  return pageTitles.find(page => pathname.startsWith(page.path))?.label || 'MoiDoctar'
}

export default function AppLayout() {
  const { isAuthenticated, isLoading, signOut, user, userChangeKey } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(hasAcceptedDisclaimer())
  const [showTour, setShowTour] = useState(false)

  // Re-check per account: userChangeKey changes on login/logout/switch, and the tour's
  // "seen it" flag is scoped per account (see OnboardingTour.tsx), so a second account on
  // this device should still get the tour even though AppLayout itself doesn't remount.
  useEffect(() => {
    setShowTour(!hasCompletedTour())
  }, [userChangeKey])

  // Lets Profile's "Replay welcome tour" button re-open the tour without a full page reload.
  useEffect(() => {
    const handler = () => setShowTour(true)
    window.addEventListener(REPLAY_TOUR_EVENT, handler)
    return () => window.removeEventListener(REPLAY_TOUR_EVENT, handler)
  }, [])
  const isDark = theme === 'dark'
  const pageTitle = getPageTitle(pathname)
  const displayName = getDisplayName(user)
  const avatarUrl = getProfileImage(user)

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
      {showTour && <OnboardingTour onFinish={() => setShowTour(false)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onSignOut={handleSignOut} />

      <div className="fixed top-0 left-0 right-0 md:left-[var(--spacing-sidebar-width,232px)] z-30">

        {/* Glass header */}
        <div className="bg-surface border-b border-outline-variant h-14 md:h-16">
          <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between px-2 min-[360px]:px-3 sm:px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-1.5 min-[360px]:gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 shrink-0 place-items-center rounded-xl bg-primary-container text-primary md:hidden transition-colors hover:bg-primary-container/80"
                aria-label="Open menu"
              >
                <Icon icon="menu" size="lg" />
              </button>
              <div className="min-w-0">
                <h1 className="truncate font-headline-md text-base min-[360px]:text-lg headline-lg-mobile md:text-xl font-bold text-on-surface" title={pageTitle}>
                  {pageTitle}
                </h1>
                <p className="hidden truncate text-xs font-semibold text-secondary md:block">
                  MoiDoctar health workspace
                </p>
              </div>
            </div>

            {/* Phones keep only theme + notifications here so the page title has room;
                Profile lives in the bottom nav and Sign out in the menu. */}
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 place-items-center rounded-xl text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <Icon icon={isDark ? 'light_mode' : 'dark_mode'} size="lg" />
              </button>
              <Link
                to="/history"
                className="hidden md:grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 place-items-center rounded-xl text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Previous Triages and History"
                title="Previous Triages"
              >
                <Icon icon="history" size="lg" />
              </Link>
              <Link
                to="/notifications"
                className="grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 place-items-center rounded-xl text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label="Notifications"
              >
                <Icon icon="notifications" size="lg" />
              </Link>
              <Link
                to="/profile"
                className="hidden md:grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 overflow-hidden place-items-center rounded-xl bg-primary-container text-sm font-bold text-primary transition hover:ring-2 hover:ring-primary/30"
                aria-label="Profile"
                title={displayName || 'Profile'}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="" className="h-full w-full rounded-xl object-cover" />
                  : getInitials(displayName)}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="hidden md:grid min-h-[44px] min-w-[44px] md:h-9 md:w-9 place-items-center rounded-xl text-secondary transition-colors hover:bg-error-container hover:text-error"
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
      {/* Bottom padding on phones keeps the last content (and Triage's composer) above the bottom nav. */}
      <div className="app-content md:ml-[var(--spacing-sidebar-width,232px)] pt-14 md:pt-16 min-h-[100dvh]">
        <Outlet key={userChangeKey} />
      </div>

      <MobileBottomNav />
    </div>
  )
}
