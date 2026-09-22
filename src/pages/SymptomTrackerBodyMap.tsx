import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { PremiumInput } from '../components/ui/PremiumFormControls'
import { usePersistState } from '../hooks/usePersistState'

type Severity = 'Mild' | 'Moderate' | 'Severe'

export default function SymptomTrackerBodyMap() {
  const navigate = useNavigate()
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | null>(null)
  const [symptomName, setSymptomName] = useState('')
  const [entries, setEntries] = usePersistState<{ date: string; symptom: string; severity: Severity; dot: string; labelBg: string; labelText: string }[]>('doctarr_symptoms_bm', [])

  const handleSaveEntry = () => {
    if (!symptomName.trim()) return
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const sev = selectedSeverity || 'Mild'
    const classes: Record<string, { dot: string, labelBg: string, labelText: string }> = {
      Mild: { dot: 'bg-on-secondary-container', labelBg: 'bg-secondary-container', labelText: 'text-secondary' },
      Moderate: { dot: 'bg-primary', labelBg: 'bg-primary/10', labelText: 'text-primary' },
      Severe: { dot: 'bg-error', labelBg: 'bg-error/10', labelText: 'text-error' },
    }
    setEntries(prev => [...prev, { date: dateStr, symptom: symptomName, severity: sev as Severity, ...classes[sev] }])
    setSymptomName('')
    setSelectedSeverity(null)
  }

  const severityOptions: { label: Severity }[] = [
    { label: 'Mild' },
    { label: 'Moderate' },
    { label: 'Severe' },
  ]

  return (
    <main className="min-h-screen p-4 md:p-6 max-w-[1200px] mx-auto">
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Symptom Tracker</h1>
          <p className="text-secondary font-body-md">Monitor your daily health and visualize trends over time.</p>
        </div>
        <div className="flex items-center gap-stack-sm bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/30 shadow-sm">
          <Icon icon="calendar_month" size="lg" className="text-primary" />
          <span className="font-label-md text-label-md pr-2">Today</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <section className="lg:col-span-12 bg-surface-container-lowest rounded-[16px] border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.03)] p-stack-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-white">
              <Icon icon="edit_note" size="md" />
            </div>
            <h2 className="font-headline-md text-headline-md">New Log Entry</h2>
            <button onClick={() => navigate('/body-map')} className="ml-auto bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 px-4 py-1.5 rounded-full font-label-md text-label-md flex items-center gap-2">
              <Icon icon="accessibility_new" size="md" />
              <span>Show on Body</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-lg">
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
                {severityOptions.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedSeverity(opt.label)}
                    className={`flex-1 py-3 px-2 md:px-4 rounded-full border font-label-md text-xs md:text-sm transition-all ${
                      selectedSeverity === opt.label
                        ? 'bg-primary text-white border-primary'
                        : 'border-outline-variant hover:border-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={handleSaveEntry} className="w-full sm:w-auto bg-primary text-white font-label-md px-6 md:px-8 py-3 md:py-4 rounded-full hover:bg-opacity-90 transition-transform active:scale-95 flex items-center justify-center gap-2">
              <span>Save Entry</span>
              <Icon icon="arrow_forward" size="md" />
            </button>
          </div>
        </section>

        <section className="lg:col-span-8 bg-surface-container-lowest rounded-[16px] border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.03)] p-stack-lg flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-headline-md text-headline-md">30-Day Severity Trend</h2>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-caption text-secondary">
                <span className="w-3 h-3 rounded-full bg-primary" /> Severity
              </span>
            </div>
          </div>
          <div className="flex-1 min-h-[200px] md:min-h-[300px] relative mt-4">
            <svg className="w-full h-full" viewBox="0 0 800 300">
              <line stroke="#E5E7EB" strokeDasharray="4" x1="0" x2="800" y1="50" y2="50" />
              <line stroke="#E5E7EB" strokeDasharray="4" x1="0" x2="800" y1="150" y2="150" />
              <line stroke="#E5E7EB" strokeDasharray="4" x1="0" x2="800" y1="250" y2="250" />
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

        <section className="lg:col-span-4 bg-surface-container-lowest rounded-[16px] border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col h-full">
          <div className="p-stack-lg border-b border-outline-variant/30">
            <h2 className="font-headline-md text-headline-md">Past Entries</h2>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[480px] p-stack-lg space-y-6">
            {entries.length === 0 ? (
              <p className="text-secondary font-body-md text-center py-8">No entries yet. Log your first symptom above.</p>
            ) : (
              entries.map((entry, i) => (
                <div key={i} className="relative pl-8 border-l-2 border-outline-variant group">
                  <div className={`absolute left-[-9px] top-0 w-4 h-4 rounded-full ${entry.dot} border-4 border-white shadow-sm`} />
                  <div className="flex flex-col gap-1">
                    <span className="font-label-md text-caption text-secondary uppercase">{entry.date}</span>
                    <div className="flex items-center justify-between">
                      <h3 className="font-body-md font-bold text-on-surface">{entry.symptom}</h3>
                      <div className="flex items-center gap-2">
                        <span className={`${entry.labelBg} ${entry.labelText} font-label-md text-[12px] px-2 py-0.5 rounded-full uppercase`}>{entry.severity}</span>
                        <button
                          onClick={() => setEntries(prev => prev.filter((_, idx) => idx !== i))}
                          className="opacity-0 group-hover:opacity-100 text-secondary hover:text-error transition-all p-1 rounded-full hover:bg-error/10"
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

        <section className="lg:col-span-12 relative h-48 rounded-[16px] overflow-hidden group cursor-pointer">
          <img
            alt="AI Health Analysis"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKXdX56RArmULZK_NoQ0L99HNEH3Smr4pCogZr1zloxe29vQZoB26L8Iu78idg7ZwHHUDKRyrKxSMcQWXPY2GAyGcUU_L5ikTUELOgPKOWXEE9Tb7l9pndYlQwpmnKXA5JJdpiAQwriLBBeAT0YoPgHW3irIWbiaGoOPswqOnYqvrc4_ts2NWwIzdymky9Sr03DYK7taoPrRNvjZihhWh501vmdR2fLafOADCKSzevfmE2SFGH3N4vyy5sxGrLAqa6CZyr0Qwj3n4"
          />
          <div className="absolute inset-0 bg-primary/80 flex items-center p-stack-lg">
            <div className="max-w-md text-white">
              <h3 className="font-headline-md text-headline-md mb-2">AI Health Insights</h3>
              <p className="font-body-md opacity-90">Start logging your symptoms to unlock AI-powered health insights and trends.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
