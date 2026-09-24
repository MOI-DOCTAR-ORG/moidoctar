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
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-bottom">

      {/* Glass bar */}
      <div className="bottom-nav-surface border-t border-outline-variant">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2 px-3 min-h-[44px] min-w-0 rounded-xl transition-all duration-200 ${
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
      </div>
    </nav>
  )
}
