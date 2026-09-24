import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BodyFigure, { regionLabel, type BodyView } from '../components/BodyFigure'
import Icon from '../components/Icon'
import { useBodyMap } from '../context/BodyMapContext'

type Severity = 'Mild' | 'Moderate' | 'Severe'
const severities: Severity[] = ['Mild', 'Moderate', 'Severe']

export default function BodyMap() {
  const navigate = useNavigate()
  const { selectedAreas, setSelectedAreas } = useBodyMap()
  const [view, setView] = useState<BodyView>('front')

  const selectedIds = selectedAreas.map((a) => a.id)

  const toggle = (id: string, label: string) => {
    if (selectedIds.includes(id)) {
      setSelectedAreas(selectedAreas.filter((a) => a.id !== id))
    } else {
      setSelectedAreas([...selectedAreas, { id, label: label || regionLabel(id), severity: 'Moderate', notes: '' }])
    }
  }

  const patch = (id: string, change: Partial<{ severity: Severity; notes: string }>) =>
    setSelectedAreas(selectedAreas.map((a) => (a.id === id ? { ...a, ...change } : a)))

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 md:py-8">
      <header className="mb-5">
        <h1 className="font-headline-md text-2xl font-bold text-on-surface sm:text-3xl">Where does it hurt?</h1>
        <p className="mt-1 text-sm text-on-surface-variant sm:text-base">
          Tap the parts of the body that are bothering you. You can mark more than one.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-2xl border border-outline-variant bg-surface p-4">
          <div className="mx-auto mb-4 inline-flex w-full max-w-xs rounded-full bg-surface-container p-1" role="tablist" aria-label="Body view">
            {(['front', 'back'] as BodyView[]).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`min-h-10 flex-1 rounded-full text-sm font-semibold capitalize transition-colors ${
                  view === v ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="h-[52dvh] min-h-[300px] sm:h-[58dvh]">
            <BodyFigure view={view} selected={selectedIds} onToggle={toggle} />
          </div>
        </section>

        <section className="flex flex-col rounded-2xl border border-outline-variant bg-surface">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <h2 className="text-sm font-semibold text-on-surface">Marked areas ({selectedAreas.length})</h2>
            {selectedAreas.length > 0 && (
              <button type="button" onClick={() => setSelectedAreas([])} className="min-h-9 text-sm font-semibold text-primary hover:underline">
                Clear all
              </button>
            )}
          </div>

          <div className="flex-1 space-y-3 p-4">
            {selectedAreas.length === 0 ? (
              <div className="py-8 text-center text-sm text-on-surface-variant">
                <Icon icon="touch_app" size="2xl" className="mb-2 text-outline" />
                <p>Nothing marked yet. You can skip this and just describe it in the chat.</p>
              </div>
            ) : (
              selectedAreas.map((area) => (
                <div key={area.id} className="rounded-xl border border-outline-variant p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold text-on-surface">{area.label}</p>
                    <button
                      type="button"
                      onClick={() => toggle(area.id, area.label)}
                      aria-label={`Remove ${area.label}`}
                      className="grid h-9 w-9 place-items-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error"
                    >
                      <Icon icon="delete" size="md" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-container p-1" role="group" aria-label={`${area.label} severity`}>
                    {severities.map((sev) => (
                      <button
                        key={sev}
                        type="button"
                        aria-pressed={area.severity === sev}
                        onClick={() => patch(area.id, { severity: sev })}
                        className={`min-h-9 rounded-md text-xs font-semibold transition-colors ${
                          area.severity === sev ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant'
                        }`}
                      >
                        {sev}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={area.notes}
                    onChange={(e) => patch(area.id, { notes: e.target.value })}
                    placeholder="What does it feel like? (sharp, dull, burning…)"
                    className="mt-2 min-h-11 w-full rounded-lg border border-outline bg-surface px-3 text-base text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
                  />
                </div>
              ))
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-outline-variant p-4 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => navigate('/new-triage')}
              className="min-h-12 rounded-xl border border-outline px-5 text-sm font-semibold text-on-surface hover:bg-surface-container"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => navigate('/new-triage')}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-on-primary hover:opacity-90"
            >
              {selectedAreas.length > 0 ? 'Continue to chat' : 'Continue'}
              <Icon icon="arrow_forward" size="sm" />
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
