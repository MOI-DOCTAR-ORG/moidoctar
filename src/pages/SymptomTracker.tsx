import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { PremiumInput } from '../components/ui/PremiumFormControls'
import { usePersistState } from '../hooks/usePersistState'

export default function SymptomTracker() {
  const navigate = useNavigate()
  const [severity, setSeverity] = useState<string | null>(null)
  const [symptomName, setSymptomName] = useState('')
  const [timelineEntries, setTimelineEntries] = usePersistState<{ date: string; label: string; severity: string; severityClass: string; dotClass: string }[]>('doctarr_symptoms', [])

  const handleSaveEntry = () => {
    if (!symptomName.trim()) return
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const sev = severity || 'Mild'
    const classes: Record<string, { severityClass: string, dotClass: string }> = {
      Mild: { severityClass: 'bg-[var(--neon-primary)]/15 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20', dotClass: 'bg-[var(--neon-primary)]' },
      Moderate: { severityClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/20', dotClass: 'bg-amber-400' },
      Severe: { severityClass: 'bg-error/15 text-error border border-error/20', dotClass: 'bg-error' },
    }
    setTimelineEntries(prev => [...prev, { date: dateStr, label: symptomName, severity: sev, ...classes[sev] }])
    setSymptomName('')
    setSeverity(null)
  }

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-[1200px] mx-auto font-body-md bg-surface">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Symptom Tracker</h1>
          <p className="text-secondary font-body-md">Monitor your daily health and visualize trends over time.</p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--glass-bg)] backdrop-blur-xl p-2 rounded-xl border border-[var(--glass-border)]">
          <div className="w-10 h-10 rounded-full bg-[var(--neon-primary)]/10 flex items-center justify-center text-[var(--neon-primary)] border border-[var(--neon-primary)]/20">
            <Icon icon="calendar_month" size="md" />
          </div>
          <span className="font-label-md text-label-md pr-2">Today</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-12 bg-[var(--glass-bg)] backdrop-blur-xl rounded-[16px] border border-[var(--glass-border)] p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[var(--neon-primary)]/15 flex items-center justify-center text-[var(--neon-primary)] border border-[var(--neon-primary)]/20">
              <Icon icon="edit_note" size="md" />
            </div>
            <h2 className="font-headline-md text-headline-md">New Log Entry</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="font-label-md block text-secondary">WHAT ARE YOU FEELING?</label>
              <PremiumInput
                className="h-14"
                placeholder="e.g., Migraine, Chest Tightness, Fatigue"
                type="text"
                value={symptomName}
                onChange={(e) => setSymptomName(e.target.value)}
              />
            </div>
            <div className="space-y-4">
              <label className="font-label-md block text-secondary">SEVERITY LEVEL</label>
              <div className="flex gap-2">
                {['Mild', 'Moderate', 'Severe'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={
                      'flex-1 py-3 px-2 md:px-4 rounded-full border transition-all font-label-md text-xs md:text-sm min-h-[44px] ' +
                      (severity === s
                        ? 'bg-[var(--neon-primary)] text-white border-[var(--neon-primary)] shadow-lg shadow-[var(--neon-primary)]/20'
                        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--neon-primary)]/30')
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={handleSaveEntry} className="w-full sm:w-auto bg-[var(--neon-primary)] text-white font-label-md px-6 md:px-8 py-3 md:py-4 rounded-full hover:opacity-90 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[var(--neon-primary)]/20 min-h-[44px]">
              <span>Save Entry</span>
              <Icon icon="arrow_forward" size="md" />
            </button>
          </div>
        </section>

        <section className="lg:col-span-8 bg-[var(--glass-bg)] backdrop-blur-xl rounded-[16px] border border-[var(--glass-border)] p-6 md:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-headline-md text-headline-md">30-Day Severity Trend</h2>
            <span className="flex items-center gap-1 text-caption text-secondary">
              <span className="w-3 h-3 rounded-full bg-[var(--neon-primary)]" /> Severity
            </span>
          </div>
          <div className="flex-1 min-h-[200px] md:min-h-[300px] relative mt-4">
            <svg className="w-full h-full" viewBox="0 0 800 300">
              <line stroke="var(--glass-border)" strokeDasharray="4" x1="0" x2="800" y1="50" y2="50" />
              <line stroke="var(--glass-border)" strokeDasharray="4" x1="0" x2="800" y1="150" y2="150" />
              <line stroke="var(--glass-border)" strokeDasharray="4" x1="0" x2="800" y1="250" y2="250" />
              <text className="text-[10px] fill-secondary font-label-md uppercase" x="5" y="45">Severe</text>
              <text className="text-[10px] fill-secondary font-label-md uppercase" x="5" y="145">Moderate</text>
              <text className="text-[10px] fill-secondary font-label-md uppercase" x="5" y="245">Mild</text>
            </svg>
          </div>
          <div className="flex justify-between mt-6 text-caption text-secondary px-2">
            <span>30 Days Ago</span>
            <span>15 Days Ago</span>
            <span>Today</span>
          </div>
        </section>

        <section className="lg:col-span-4 bg-[var(--glass-bg)] backdrop-blur-xl rounded-[16px] border border-[var(--glass-border)] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-[var(--glass-border)]">
            <h2 className="font-headline-md text-headline-md">Past Entries</h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[480px] p-6 space-y-6">
            {timelineEntries.length === 0 ? (
              <p className="text-secondary font-body-md text-center py-8">No entries yet. Log your first symptom above.</p>
            ) : (
              timelineEntries.map((entry, i) => (
                <div key={i} className="relative pl-8 border-l-2 border-[var(--glass-border)]">
                  <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${entry.dotClass} border-4 border-surface shadow-sm`} />
                  <div className="flex flex-col gap-1">
                    <span className="font-label-md text-caption text-secondary uppercase">{entry.date}</span>
                    <div className="flex items-center justify-between">
                      <h3 className="font-body-md font-bold text-on-surface">{entry.label}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`font-label-md text-[12px] px-2 py-0.5 rounded-full uppercase ${entry.severityClass}`}>
                          {entry.severity}
                        </span>
                        <button
                          onClick={() => setTimelineEntries(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-secondary hover:text-error transition-all p-1 rounded-full hover:bg-error/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Icon icon="close" size="xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section onClick={() => navigate('/symptom-tracker-body-map')} className="lg:col-span-12 relative h-56 rounded-[16px] overflow-hidden group cursor-pointer bg-[var(--glass-bg)] border border-[var(--glass-border)]">
          <img
            alt="AI Health Analysis"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKXdX56RArmULZK_NoQ0L99HNEH3Smr4pCogZr1zloxe29vQZoB26L8Iu78idg7ZwHHUDKRyrKxSMcQWXPY2GAyGcUU_L5ikTUELOgPKOWXEE9Tb7l9pndYlQwpmnKXA5JJdpiAQwriLBBeAT0YoPgHW3irIWbiaGoOPswqOnYqvrc4_ts2NWwIzdymky9Sr03DYK7taoPrRNvjZihhWh501vmdR2fLafOADCKSzevfmE2SFGH3N4vyy5sxGrLAqa6CZyr0Qwj3n4"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-primary)]/15 to-secondary/10 dark:bg-slate-900/90 backdrop-blur-sm flex items-center p-6 z-10">
            <div className="max-w-md">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-[var(--neon-primary)]/20 flex items-center justify-center flex-shrink-0 border border-[var(--neon-primary)]/30">
                  <Icon icon="psychology" size="xl" className="text-[var(--neon-primary)]" />
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md mb-2 text-slate-900 dark:text-white">AI Health Insights</h3>
                  <p className="font-body-md text-slate-700 dark:text-slate-100/90 leading-7">
                    Start logging your symptoms to unlock AI-powered health insights and trends.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
