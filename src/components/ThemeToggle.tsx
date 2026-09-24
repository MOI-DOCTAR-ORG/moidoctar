import Icon from './Icon'
import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="rounded-2xl bg-surface border border-outline-variant p-3">
      <button
        type="button"
        onClick={toggleTheme}
        className="w-full flex items-center gap-3 md:gap-stack-md pl-2.5 py-2.5 min-h-[44px] text-primary hover:opacity-80 transition-colors text-sm md:text-base text-left rounded-xl hover:bg-primary/10"
      >
        <span className="relative">
          <Icon icon={theme === 'dark' ? 'light_mode' : 'dark_mode'} size="lg" />
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
