import React, { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  initialized: boolean
}

const STORAGE_KEY = 'doctarr_theme'
const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function readInitial(): Theme {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s === 'dark' || s === 'light') return s as Theme
  } catch (e) {
    // ignore
  }
  if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readInitial())
  const [initialized, setInitialized] = useState(false)

  // apply theme synchronously to avoid flashes
  useLayoutEffect(() => {
    const body = document.body
    if (theme === 'dark') {
      body.classList.add('dark')
      body.classList.remove('light')
      body.setAttribute('data-theme', 'dark')
    } else {
      body.classList.add('light')
      body.classList.remove('dark')
      body.setAttribute('data-theme', 'light')
    }

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch (e) {
      // ignore
    }

    setInitialized(true)
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)
  const toggleTheme = () => setThemeState(prev => (prev === 'light' ? 'dark' : 'light'))

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, initialized }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
