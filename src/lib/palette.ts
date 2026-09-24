/**
 * Palette engine.
 *
 * Give it one accent colour and a mode, get back every CSS variable the app
 * uses. The accent is nudged if needed so button text stays readable (WCAG AA,
 * 4.5:1). Urgency colours (error / warning / success) never change with the
 * accent: a red "emergency" should look the same whatever theme someone picks.
 */

export type Mode = 'light' | 'dark'
export type RGB = [number, number, number]

export const DEFAULT_ACCENT = '#2763eb' // the MoiDoctar logo blue

export interface AccentPreset {
  id: string
  name: string
  hex: string
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'moidoctar', name: 'MoiDoctar blue', hex: '#2763eb' },
  { id: 'navy', name: 'Deep navy', hex: '#1f3a8a' },
  { id: 'ocean', name: 'Ocean', hex: '#0369a1' },
  { id: 'teal', name: 'Teal', hex: '#0f766e' },
  { id: 'forest', name: 'Forest', hex: '#2f7d4f' },
  { id: 'violet', name: 'Violet', hex: '#6d28d9' },
  { id: 'rose', name: 'Rose', hex: '#be185d' },
  { id: 'copper', name: 'Copper', hex: '#b45309' },
]

// ---------- colour maths ----------

export function normalizeHex(input: string): string | null {
  let v = (input || '').trim().toLowerCase()
  if (!v.startsWith('#')) v = '#' + v
  if (/^#[0-9a-f]{3}$/.test(v)) v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]
  return /^#[0-9a-f]{6}$/.test(v) ? v : null
}

export function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex) || DEFAULT_ACCENT
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

export function rgbToHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map(n => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')).join('')
}

export function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [(h * 60 + 360) % 360, s, l]
}

export function hslToRgb(h: number, s: number, l: number): RGB {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255].map(Math.round) as RGB
}

export function luminance([r, g, b]: RGB): number {
  const f = (v: number) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrast(a: RGB, b: RGB): number {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const hsl = (h: number, s: number, l: number): RGB => hslToRgb(h, Math.min(1, Math.max(0, s)), Math.min(1, Math.max(0, l)))

// ---------- fixed semantic colours (never follow the accent) ----------

const SEMANTIC: Record<Mode, Record<string, RGB>> = {
  light: {
    error: [180, 35, 24], 'on-error': [255, 255, 255], 'error-container': [253, 232, 230], 'on-error-container': [122, 26, 18],
    tertiary: [138, 90, 18], 'tertiary-container': [248, 231, 200], 'tertiary-fixed': [233, 194, 122], 'tertiary-fixed-dim': [212, 169, 80],
    'on-tertiary-fixed-variant': [61, 39, 4], 'on-tertiary-container': [61, 39, 4],
    warning: [138, 90, 18], 'warning-container': [251, 234, 204], 'on-warning-container': [74, 48, 5],
    success: [47, 125, 79], 'success-container': [220, 239, 227], 'on-success-container': [18, 61, 36],
  },
  dark: {
    error: [242, 133, 123], 'on-error': [58, 10, 6], 'error-container': [92, 26, 20], 'on-error-container': [252, 208, 203],
    tertiary: [224, 178, 92], 'tertiary-container': [74, 53, 16], 'tertiary-fixed': [224, 178, 92], 'tertiary-fixed-dim': [201, 154, 63],
    'on-tertiary-fixed-variant': [245, 226, 187], 'on-tertiary-container': [245, 226, 187],
    warning: [224, 178, 92], 'warning-container': [74, 53, 16], 'on-warning-container': [245, 226, 187],
    success: [124, 199, 154], 'success-container': [28, 61, 42], 'on-success-container': [207, 238, 219],
  },
}

// ---------- the generator ----------

export interface Palette {
  vars: Record<string, string>
  /** The colour actually used for buttons, after any readability adjustment. */
  primaryHex: string
  /** True when the chosen accent had to be changed to stay readable. */
  adjusted: boolean
  background: string
}

export function buildPalette(accentInput: string, mode: Mode): Palette {
  const accent = hexToRgb(accentInput)
  const [h, sRaw, lRaw] = rgbToHsl(accent)
  // A grey accent has no meaningful hue; keep neutrals grey then.
  const s = Math.min(0.92, Math.max(sRaw, sRaw < 0.08 ? 0 : 0.35))
  const tint = Math.min(0.24, sRaw * 0.32) // how much colour bleeds into the greys

  const tokens: Record<string, RGB> = {}
  let primary: RGB
  let adjusted = false

  if (mode === 'light') {
    let l = lRaw
    primary = hsl(h, s, l)
    // Test against the (slightly darker) page tint; if it passes there it passes on white cards too.
    const pageBg = hsl(h, tint, 0.97)
    while (contrast(primary, pageBg) < 4.5 && l > 0.08) {
      l -= 0.01
      primary = hsl(h, s, l)
    }
    adjusted = Math.abs(l - lRaw) > 0.005
    Object.assign(tokens, {
      background: hsl(h, tint, 0.97),
      primary,
      'on-primary': [255, 255, 255],
      'primary-container': hsl(h, Math.min(0.9, s + 0.05), 0.92),
      'on-primary-container': hsl(h, s, 0.2),
      'on-primary-fixed-variant': hsl(h, s, 0.2),
      'primary-fixed-dim': hsl(h, Math.min(0.85, s), 0.76),
      secondary: hsl(h, tint * 0.6, 0.34),
      'on-secondary': [255, 255, 255],
      'secondary-container': hsl(h, tint, 0.92),
      'on-secondary-container': hsl(h, tint, 0.14),
      surface: [255, 255, 255],
      'on-surface': hsl(h, tint, 0.11),
      'surface-container': hsl(h, tint, 0.95),
      'surface-container-low': hsl(h, tint, 0.965),
      'surface-container-lowest': [255, 255, 255],
      'surface-container-high': hsl(h, tint, 0.93),
      'surface-container-highest': hsl(h, tint, 0.9),
      'on-surface-variant': hsl(h, tint * 0.6, 0.36),
      'on-background': hsl(h, tint, 0.11),
      outline: hsl(h, tint * 0.6, 0.66),
      'outline-variant': hsl(h, tint, 0.9),
      'secondary-fixed': hsl(h, tint, 0.92),
      'secondary-fixed-dim': hsl(h, tint * 0.6, 0.68),
      'surface-variant': hsl(h, tint, 0.935),
    })
  } else {
    const bg = hsl(h, tint, 0.08)
    let l = Math.max(lRaw, 0.66)
    primary = hsl(h, Math.min(s, 0.85), l)
    while (contrast(primary, bg) < 4.5 && l < 0.92) {
      l += 0.01
      primary = hsl(h, Math.min(s, 0.85), l)
    }
    // In dark mode the accent is always lightened, so "adjusted" is only worth
    // flagging when it moved a lot.
    adjusted = Math.abs(l - lRaw) > 0.18
    const onPrimary = hsl(h, 0.5, 0.11)
    Object.assign(tokens, {
      background: bg,
      primary,
      'on-primary': onPrimary,
      'primary-container': hsl(h, Math.min(0.6, s), 0.24),
      'on-primary-container': hsl(h, Math.min(0.8, s), 0.9),
      'on-primary-fixed-variant': hsl(h, Math.min(0.8, s), 0.9),
      'primary-fixed-dim': hsl(h, Math.min(0.7, s), 0.72),
      secondary: hsl(h, tint * 0.6, 0.72),
      'on-secondary': hsl(h, tint, 0.12),
      'secondary-container': hsl(h, tint, 0.22),
      'on-secondary-container': hsl(h, tint, 0.9),
      surface: hsl(h, tint, 0.115),
      'on-surface': hsl(h, tint * 0.6, 0.92),
      'surface-container': hsl(h, tint, 0.14),
      'surface-container-low': hsl(h, tint, 0.125),
      'surface-container-lowest': hsl(h, tint, 0.07),
      'surface-container-high': hsl(h, tint, 0.17),
      'surface-container-highest': hsl(h, tint, 0.21),
      'on-surface-variant': hsl(h, tint * 0.5, 0.72),
      'on-background': hsl(h, tint * 0.6, 0.92),
      outline: hsl(h, tint * 0.5, 0.42),
      'outline-variant': hsl(h, tint, 0.22),
      'secondary-fixed': hsl(h, tint, 0.22),
      'secondary-fixed-dim': hsl(h, tint * 0.5, 0.45),
      'surface-variant': hsl(h, tint, 0.19),
    })
  }

  Object.assign(tokens, SEMANTIC[mode])

  const vars: Record<string, string> = {}
  for (const [name, rgb] of Object.entries(tokens)) {
    vars[`--rgb-${name}`] = `${rgb[0]} ${rgb[1]} ${rgb[2]}`
    vars[`--color-${name}`] = `rgb(var(--rgb-${name}))`
  }
  const glassBg = tokens.surface
  vars['--glass-bg'] = rgbToHex(glassBg)
  vars['--glass-border'] = rgbToHex(tokens['outline-variant'])
  vars['--glass-shadow'] = mode === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.4)' : '0 1px 2px rgba(15, 23, 42, 0.06)'
  vars['--neon-primary'] = 'rgb(var(--rgb-primary))'
  vars['--neon-accent'] = mode === 'dark' ? 'rgb(var(--rgb-primary-container))' : 'rgb(var(--rgb-primary-fixed-dim))'
  vars['--neon-glow-color'] = 'transparent'

  return { vars, primaryHex: rgbToHex(primary), adjusted, background: rgbToHex(tokens.background) }
}
