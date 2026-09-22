import Icon from './Icon'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="rounded-2xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] p-3 shadow-[0_8px_32px_rgba(148,197,253,0.08)]">
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full flex items-center gap-3 md:gap-stack-md pl-2.5 py-2.5 min-h-[44px] text-[var(--neon-primary)] hover:text-[var(--neon-accent)] transition-colors text-sm md:text-base text-left rounded-xl hover:bg-white/5"
      >
        <span className="relative">
          <Icon icon={theme === 'dark' ? 'light_mode' : 'dark_mode'} size="lg" />
          <span
            className="absolute inset-0 rounded-full blur-md opacity-50"
            style={{
              background: theme === 'dark'
                ? 'radial-gradient(circle, rgba(255,200,50,0.6) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(148,197,253,0.6) 0%, transparent 70%)',
            }}
          />
        </span>
        <span className="font-label-md text-label-md">
          {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        </span>
      </button>
      <p className="mt-2 text-xs text-secondary leading-5">
        {theme === 'light'
          ? 'Light mode is active with crisp surfaces, calm accents, and sharper typography for a professional workspace.'
          : 'Dark mode is active. Switch to light mode anytime for a brighter, cleaner interface.'}
      </p>
    </div>
  )
}
