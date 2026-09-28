import { useLocation, Link } from 'react-router-dom'
import Icon from './Icon'

const navItems = [
  { label: 'Home', icon: 'dashboard', to: '/dashboard' },
  { label: 'Triage', icon: 'medical_services', to: '/new-triage' },
  { label: 'Care', icon: 'local_hospital', to: '/local-care' },
  { label: 'History', icon: 'history', to: '/history' },
  { label: 'Profile', icon: 'person', to: '/profile' },
]

export default function MobileBottomNav() {
  const { pathname } = useLocation()

  const isActive = (to: string) => to === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(to)

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 md:hidden bottom-nav-surface border-t border-outline-variant safe-area-bottom" aria-label="Main navigation">
      {/* Bar + its 1px top border = --mobile-nav-height exactly, so pages can reserve that much space. */}
      <div className="flex h-[calc(var(--mobile-nav-height)-1px)] items-center justify-around px-1">
        {navItems.map((item) => {
          const active = isActive(item.to)
          return (
            <Link
              key={item.label}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-1.5 min-h-[48px] min-w-0 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                active
                  ? 'text-primary'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <div className="relative">
                <Icon icon={item.icon} size="md" />
                {/* Neon dot indicator for active item */}
                {active && (
                  <span
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary"
                  />
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-tight ${active ? 'font-bold text-primary' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
