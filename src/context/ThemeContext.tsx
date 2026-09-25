import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { buildPalette, DEFAULT_ACCENT, normalizeHex, type Mode } from '../lib/palette'

export type ThemeMode = Mode | 'system'

interface ThemeContextType {
  /** The look actually on screen right now. */
  theme: Mode
  /** What the person chose: light, dark, or follow the device. */
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  setTheme: (t: Mode) => void
  toggleTheme: () => void
  /** The accent the person picked (hex). */
  accent: string
  setAccent: (hex: string) => boolean
  /** The colour actually used on buttons (may be a shade of `accent` for readability). */
  appliedAccent: string
  /** True when the picked accent was adjusted to keep text readable. */
  accentAdjusted: boolean
  resetTheme: () => void
  isDefault: boolean
  initialized: boolean
}

// Same keys the boot script in index.html reads, so there is no flash on load.
const MODE_KEY = 'doctarr_theme'
const ACCENT_KEY = 'doctarr_accent'
const VARS_KEY = 'doctarr_theme_vars'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function readMode(): ThemeMode {
  try {
    const s = localStorage.getItem(MODE_KEY)
    if (s === 'dark' || s === 'light' || s === 'system') return s
  } catch { /* storage unavailable */ }
  // First visit: follow the device until they choose.
  return 'system'
}

function readAccent(): string {
  try {
    const a = normalizeHex(localStorage.getItem(ACCENT_KEY) || '')
    if (a) return a
  } catch { /* storage unavailable */ }
  return DEFAULT_ACCENT
}

const systemPrefersDark = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readMode)
  const [accent, setAccentState] = useState<string>(readAccent)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)
  const [initialized, setInitialized] = useState(false)

  // Follow the device when set to "system".
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemDark(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const theme: Mode = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
  const isDefaultAccent = accent === DEFAULT_ACCENT

  const palettes = useMemo(
    () => ({ light: buildPalette(accent, 'light'), dark: buildPalette(accent, 'dark') }),
    [accent],
  )
  const current = palettes[theme]

  // Apply synchronously so there is never a frame in the wrong colours.
  useLayoutEffect(() => {
    const body = document.body
    body.classList.toggle('dark', theme === 'dark')
    body.classList.toggle('light', theme === 'light')
    body.setAttribute('data-theme', theme)

    // Clear anything set before, then set the current palette. The default
    // accent needs no inline variables: index.css already has it.
    for (let i = body.style.length - 1; i >= 0; i--) {
      const name = body.style.item(i)
      if (name.startsWith('--')) body.style.removeProperty(name)
    }
    if (!isDefaultAccent) {
      for (const [k, v] of Object.entries(current.vars)) body.style.setProperty(k, v)
    }

    // Colour the phone's browser bar to match the page.
    let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'theme-color'
      document.head.appendChild(meta)
    }
    meta.content = current.background

    try {
      localStorage.setItem(MODE_KEY, mode)
      localStorage.setItem(ACCENT_KEY, accent)
      // Precomputed for the boot script so a custom colour shows on first paint.
      if (isDefaultAccent) localStorage.removeItem(VARS_KEY)
      else localStorage.setItem(VARS_KEY, JSON.stringify({
        light: palettes.light.vars,
        dark: palettes.dark.vars,
        bg: { light: palettes.light.background, dark: palettes.dark.background },
      }))
    } catch { /* storage unavailable */ }

    setInitialized(true)
  }, [theme, mode, accent, isDefaultAccent, palettes, current])

  const setMode = useCallback((m: ThemeMode) => setModeState(m), [])
  const setTheme = useCallback((t: Mode) => setModeState(t), [])
  const toggleTheme = useCallback(() => setModeState(theme === 'dark' ? 'light' : 'dark'), [theme])
  const setAccent = useCallback((hex: string) => {
    const n = normalizeHex(hex)
    if (!n) return false
    setAccentState(n)
    return true
  }, [])
  const resetTheme = useCallback(() => {
    setAccentState(DEFAULT_ACCENT)
    setModeState('system')
  }, [])

  const value: ThemeContextType = {
    theme,
    mode,
    setMode,
    setTheme,
    toggleTheme,
    accent,
    setAccent,
    appliedAccent: current.primaryHex,
    accentAdjusted: current.adjusted,
    resetTheme,
    isDefault: isDefaultAccent && mode === 'system',
    initialized,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
