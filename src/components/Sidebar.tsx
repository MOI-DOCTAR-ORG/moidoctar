import { useLocation, Link } from 'react-router-dom'
import Icon from './Icon'

const primaryNav = [
  { label: 'Dashboard', icon: 'dashboard', to: '/dashboard' },
  { label: 'New Triage', icon: 'medical_services', to: '/new-triage' },
  { label: 'History', icon: 'history', to: '/history' },
  { label: 'Care Details', icon: 'local_hospital', to: '/care-details' },
  { label: 'Nearby Care', icon: 'location_on', to: '/local-care' },
  { label: 'Symptom Tracker', icon: 'monitor_heart', to: '/symptom-tracker' },
  { label: 'Medications', icon: 'pill', to: '/medication-tracker' },
  { label: 'AI Settings', icon: 'psychology', to: '/ai-settings' },
]

const bottomNav = [
  { label: 'Support', icon: 'help' },
  { label: 'Terms & Conditions', icon: 'contract' },
]

type SidebarProps = {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { pathname } = useLocation()

  const handleNav = () => {
    onClose()
  }

  const isActiveRoute = (to: string) => to === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(to)

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative px-3 pb-3">
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            onClick={handleNav}
            className="flex h-11 items-center gap-2.5 rounded-xl px-2 transition-all duration-300 hover:bg-primary/10 group"
          >
            <img
              src="/moidoctar-logo.svg"
              alt="MoiDoctar"
              className="h-8 w-8 object-contain transition-all duration-300"
            />
            <div className="min-w-0">
              <h1 className="truncate font-headline-md text-lg font-extrabold text-primary">
                MoiDoctar
              </h1>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="grid min-h-[44px] min-w-[44px] shrink-0 place-items-center rounded-xl text-secondary hover:bg-primary/10 hover:text-primary md:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <Icon icon="close" size="md" />
          </button>
        </div>
      </div>

      <nav className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2.5 pb-3" aria-label="Primary navigation">
        {primaryNav.map((item) => {
          const isActive = isActiveRoute(item.to)
          return (
            <Link
              key={item.label}
              to={item.to}
              onClick={handleNav}
              aria-current={isActive ? 'page' : undefined}
              className={`sidebar-active-pill flex h-11 shrink-0 items-center gap-2.5 rounded-xl px-2.5 text-sm transition-all duration-200 border-l-2 ${
                isActive
                  ? 'border-l-primary bg-primary/10 text-primary'
                  : 'border-l-transparent text-secondary hover:bg-primary/10 hover:text-on-surface'
              }`}
            >
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg transition-colors ${
                isActive ? 'bg-primary/10' : 'bg-transparent'
              }`}>
                <Icon icon={item.icon} size="md" />
              </span>
              <span className="truncate font-label-md text-label-md">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-outline-variant px-2.5 pt-3">
        {bottomNav.map((item) => {
          return (
            <button
              key={item.label}
              type="button"
              onClick={handleNav}
              className="flex h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-sm text-secondary transition-colors hover:bg-primary/10 hover:text-on-surface"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center">
                <Icon icon={item.icon} size="md" />
              </span>
              <span className="truncate font-label-md text-label-md">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`sidebar-surface fixed top-0 left-0 h-[100dvh] w-[85vw] max-w-[260px] flex flex-col py-3 border-r border-outline-variant z-50 transition-transform duration-300 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="sidebar-surface fixed top-0 left-0 h-screen w-[var(--spacing-sidebar-width,232px)] hidden md:flex flex-col py-4 border-r border-outline-variant z-50">
        {sidebarContent}
      </aside>
    </>
  )
}
