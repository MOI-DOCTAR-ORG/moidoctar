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
      {/* Top neon gradient border */}
      <div
        className="h-px w-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--neon-primary) 25%, var(--neon-accent) 75%, transparent 100%)',
        }}
      />

      {/* Glass bar */}
      <div className="bottom-nav-surface backdrop-blur-2xl border-t border-[var(--glass-border)]">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const active = isActive(item.to)
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-2 px-3 min-h-[44px] min-w-0 rounded-xl transition-all duration-200 ${
                  active
                    ? 'text-[var(--neon-primary)] drop-shadow-[0_0_6px_var(--neon-primary)]'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                <div className="relative">
                  <Icon icon={item.icon} size="md" />
                  {/* Neon dot indicator for active item */}
                  {active && (
                    <span
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-[var(--neon-primary)] shadow-[0_0_6px_var(--neon-primary),0_0_12px_var(--neon-primary)]"
                    />
                  )}
                </div>
                <span className={`text-[10px] font-semibold leading-tight ${active ? 'font-bold text-[var(--neon-primary)]' : ''}`}>
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
