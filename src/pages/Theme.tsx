import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../components/Icon'
import { useTheme, type ThemeMode } from '../context/ThemeContext'
import { ACCENT_PRESETS, buildPalette, contrast, hexToRgb, normalizeHex } from '../lib/palette'

/** "246 248 253" (a palette value) -> "rgb(246,248,253)" for inline styles. */
const rgbOf = (pal: ReturnType<typeof buildPalette>, key: string) => `rgb(${pal.vars[`--rgb-${key}`].split(' ').join(',')})`

/** White or near-black, whichever reads better on a swatch. */
const inkOn = (hex: string) => (contrast(hexToRgb(hex), [255, 255, 255]) >= contrast(hexToRgb(hex), [17, 24, 39]) ? '#ffffff' : '#111827')

function MiniScreen({ pal }: { pal: ReturnType<typeof buildPalette> }) {
  return (
    <div className="h-full w-full p-2" style={{ background: rgbOf(pal, 'background') }}>
      <div className="mb-1.5 h-1.5 w-1/3 rounded-full" style={{ background: rgbOf(pal, 'on-surface') }} />
      <div className="rounded-md p-1.5" style={{ background: rgbOf(pal, 'surface'), boxShadow: `0 0 0 1px ${rgbOf(pal, 'outline-variant')}` }}>
        <div className="mb-1 h-1 w-3/4 rounded-full" style={{ background: rgbOf(pal, 'on-surface-variant') }} />
        <div className="h-3 w-1/2 rounded-full" style={{ background: rgbOf(pal, 'primary') }} />
      </div>
    </div>
  )
}

function ModeCard({ value, label, hint, selected, onSelect, accent }: {
  value: ThemeMode; label: string; hint: string; selected: boolean; onSelect: () => void; accent: string
}) {
  const light = useMemo(() => buildPalette(accent, 'light'), [accent])
  const dark = useMemo(() => buildPalette(accent, 'dark'), [accent])
  return (
    <button
      type="button" role="radio" aria-checked={selected} onClick={onSelect}
      className={`group relative flex min-h-11 flex-col rounded-2xl border p-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? 'border-primary bg-primary-container/40 ring-1 ring-primary' : 'border-outline-variant bg-surface hover:border-outline'}`}
    >
      <div className="relative h-20 w-full overflow-hidden rounded-xl border border-outline-variant" aria-hidden="true">
        {value === 'system' ? (
          <>
            <div className="absolute inset-0"><MiniScreen pal={light} /></div>
            <div className="absolute inset-0" style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}><MiniScreen pal={dark} /></div>
          </>
        ) : (
          <MiniScreen pal={value === 'dark' ? dark : light} />
        )}
      </div>
      <div className="flex items-start justify-between gap-2 px-1 pb-1 pt-2">
        <div>
          <p className="text-sm font-semibold text-on-surface">{label}</p>
          <p className="text-xs text-on-surface-variant">{hint}</p>
        </div>
        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary text-on-primary' : 'border-outline'}`}>
          {selected && <Icon icon="check" size="xs" />}
        </span>
      </div>
    </button>
  )
}

export default function Theme() {
  const { mode, setMode, accent, setAccent, appliedAccent, accentAdjusted, resetTheme, isDefault } = useTheme()
  const [hexDraft, setHexDraft] = useState(accent)
  const [hexError, setHexError] = useState(false)
  const draftRef = useRef(hexDraft)
  draftRef.current = hexDraft

  // Keep the text box in step when the accent changes from a swatch or the picker,
  // but never overwrite something the person is still typing.
  useEffect(() => {
    if (normalizeHex(draftRef.current) !== accent) setHexDraft(accent)
    setHexError(false)
  }, [accent])

  const isPreset = ACCENT_PRESETS.some(p => p.hex === accent)

  // While typing, only a complete 6-digit code is applied. Shorthand like #0af is
  // accepted when they leave the box (otherwise "#fff" would fire mid-way through "#ffff00").
  const onHexChange = (value: string) => {
    setHexDraft(value)
    setHexError(false)
    if (/^#?[0-9a-f]{6}$/i.test(value.trim())) {
      const ok = normalizeHex(value)
      if (ok) setAccent(ok)
    }
  }
  const onHexBlur = () => {
    const ok = normalizeHex(hexDraft)
    if (ok) { setAccent(ok); setHexDraft(ok); setHexError(false) }
    else setHexError(hexDraft.trim().length > 0 && hexDraft.trim() !== accent)
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="font-headline-md text-2xl font-semibold text-on-surface">Theme</h1>
      <p className="mt-1 text-sm text-on-surface-variant">Make MoiDoctar look the way you like. Changes apply straight away and are saved on this device.</p>

      {/* ---------- mode ---------- */}
      <section className="mt-8" aria-labelledby="mode-h">
        <h2 id="mode-h" className="text-base font-semibold text-on-surface">Light or dark</h2>
        <div role="radiogroup" aria-labelledby="mode-h" className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
          <ModeCard value="light" label="Light" hint="Bright" selected={mode === 'light'} onSelect={() => setMode('light')} accent={accent} />
          <ModeCard value="dark" label="Dark" hint="Easy at night" selected={mode === 'dark'} onSelect={() => setMode('dark')} accent={accent} />
          <ModeCard value="system" label="Auto" hint="Match my phone" selected={mode === 'system'} onSelect={() => setMode('system')} accent={accent} />
        </div>
      </section>

      {/* ---------- accent ---------- */}
      <section className="mt-8" aria-labelledby="accent-h">
        <h2 id="accent-h" className="text-base font-semibold text-on-surface">Colour</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Used for buttons, links and highlights.</p>

        <div role="radiogroup" aria-labelledby="accent-h" className="mt-4 grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-8">
          {ACCENT_PRESETS.map(p => {
            const selected = accent === p.hex
            return (
              <button
                key={p.id} type="button" role="radio" aria-checked={selected} aria-label={p.name} onClick={() => setAccent(p.hex)}
                className="flex flex-col items-center gap-1.5 rounded-xl py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-shadow ${selected ? 'ring-2 ring-offset-2 ring-primary ring-offset-background' : 'ring-1 ring-outline-variant'}`}
                  style={{ background: p.hex, color: inkOn(p.hex) }}
                >
                  {selected && <Icon icon="check" size="md" />}
                </span>
                <span className={`text-center text-xs leading-tight ${selected ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>{p.name}</span>
              </button>
            )
          })}
        </div>

        <div className={`mt-5 rounded-2xl border p-4 ${!isPreset ? 'border-primary bg-primary-container/30' : 'border-outline-variant bg-surface'}`}>
          <p className="text-sm font-semibold text-on-surface">Pick your own</p>
          <div className="mt-3 flex items-center gap-3">
            <label className="relative h-11 w-11 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-outline focus-within:ring-2 focus-within:ring-primary" style={{ background: accent }}>
              <span className="sr-only">Choose a custom colour</span>
              <input
                type="color" value={accent} onChange={e => setAccent(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
            <label className="min-w-0 flex-1">
              <span className="sr-only">Colour code</span>
              <input
                value={hexDraft} onChange={e => onHexChange(e.target.value)} onBlur={onHexBlur} spellCheck={false} autoCapitalize="none" autoComplete="off" inputMode="text" maxLength={7}
                aria-invalid={hexError} aria-describedby="hex-help"
                className={`min-h-11 w-full rounded-xl border bg-surface px-3 font-mono text-base uppercase text-on-surface outline-none focus:border-primary ${hexError ? 'border-error' : 'border-outline-variant'}`}
                placeholder="#2763EB"
              />
            </label>
          </div>
          <p id="hex-help" className={`mt-2 text-xs ${hexError ? 'text-error' : 'text-on-surface-variant'}`}>
            {hexError ? 'That is not a colour code. Try something like #2763eb.' : 'Tap the circle to choose a colour, or type a colour code.'}
          </p>
          {accentAdjusted && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-primary-container px-3 py-2 text-xs text-on-primary-container" role="status">
              <Icon icon="info" size="sm" className="mt-px shrink-0" />
              <span>We changed this colour slightly so text on buttons stays easy to read. <span className="mt-1 inline-flex items-center gap-1.5 align-middle"><span className="inline-block h-3 w-3 rounded-full ring-1 ring-outline" style={{ background: appliedAccent }} aria-hidden="true" /> <span className="font-mono uppercase">{appliedAccent}</span></span></span>
            </p>
          )}
        </div>
      </section>

      {/* ---------- preview ---------- */}
      <section className="mt-8" aria-labelledby="preview-h">
        <h2 id="preview-h" className="text-base font-semibold text-on-surface">Preview</h2>
        <div className="mt-3 rounded-2xl border border-outline-variant bg-surface p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-sm font-semibold text-on-primary-container" aria-hidden="true">L</span>
            <div className="max-w-md rounded-2xl rounded-tl-md border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface">
              Hi, I&rsquo;m Liana. Tell me what you&rsquo;re feeling and when it started.
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" tabIndex={-1} className="min-h-11 rounded-full bg-primary px-6 font-label-md text-label-md text-on-primary">Start triage</button>
            <button type="button" tabIndex={-1} className="min-h-11 rounded-full bg-primary-container px-5 font-label-md text-label-md text-on-primary-container">History</button>
            <button type="button" tabIndex={-1} className="min-h-11 rounded-full border border-outline px-5 font-label-md text-label-md text-primary">Learn more</button>
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Urgency colours never change</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-error-container px-3 py-1 text-xs font-semibold text-on-error-container">Emergency</span>
            <span className="rounded-full bg-warning-container px-3 py-1 text-xs font-semibold text-on-warning-container">Urgent</span>
            <span className="rounded-full bg-success-container px-3 py-1 text-xs font-semibold text-on-success-container">Non-urgent</span>
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">Red, amber and green stay the same in every theme, so a warning always looks like a warning.</p>
        </div>
      </section>

      <div className="mt-8 border-t border-outline-variant pt-5">
        <button
          type="button" onClick={resetTheme} disabled={isDefault}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline px-5 font-label-md text-label-md text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon icon="restart_alt" size="md" />
          Reset to MoiDoctar blue
        </button>
      </div>
    </main>
  )
}
