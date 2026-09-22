import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { PremiumInput, PremiumSelect } from '../components/ui/PremiumFormControls'
import { usePersistState } from '../hooks/usePersistState'

interface SymptomReport {
  id: number
  symptom: string
  severity: string
  duration: string
  notes: string
  timestamp: string
}

export default function CareDetails() {
  const navigate = useNavigate()
  const { addSession } = useAuth()
  const [followUp, setFollowUp] = useState(true)

  const [symptom, setSymptom] = useState('')
  const [severity, setSeverity] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [reports, setReports] = usePersistState<SymptomReport[]>('doctarr_care_reports', [])

  const submitReport = () => {
    if (!symptom.trim()) return
    const report: SymptomReport = {
      id: Date.now(),
      symptom,
      severity: severity || 'Mild',
      duration: duration || 'Not specified',
      notes,
      timestamp: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    }
    setReports(prev => [report, ...prev])
    addSession({
      id: 'sess-' + Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      condition: symptom,
      description: `${severity || 'Mild'} ${symptom} for ${duration || 'unknown duration'}. ${notes}`,
      severity: severity === 'Severe' ? 'Urgent' : severity === 'Moderate' ? 'Moderate' : 'Stable',
      statusLabel: 'Reviewed',
      statusIcon: 'clinical_notes',
    })
    setSymptom('')
    setSeverity('')
    setDuration('')
    setNotes('')
  }

  return (
    <main className="min-h-[100dvh] p-4 md:p-6 max-w-container-max-width mx-auto bg-background text-on-surface font-body-md">
      <header className="mb-stack-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-secondary mb-2">
            <button onClick={() => navigate('/history')} className="text-caption font-caption hover:text-[var(--neon-primary)] transition-colors">History</button>
            <Icon icon="chevron_right" size="sm" />
            <span className="text-caption font-caption text-[var(--neon-primary)] font-bold">Care Details</span>
          </nav>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Care Details</h2>
        </div>
      </header>

      {/* Severity Status Overview */}
      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-stack-lg">
        {(['Mild', 'Moderate', 'Severe'] as const).map(sev => {
          const count = reports.filter(r => r.severity === sev).length
          const colors = {
            Mild: 'bg-green-500/15 border-green-500/30 text-green-400',
            Moderate: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
            Severe: 'bg-error/15 border-error/30 text-error',
          }
          const statuses = {
            Mild: { label: 'Active Monitoring', icon: 'check_circle' },
            Moderate: { label: 'Needs Attention', icon: 'info' },
            Severe: { label: 'Urgent', icon: 'warning' },
          }
          return (
            <div key={sev} className={`rounded-xl border p-3 md:p-4 ${colors[sev]}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase font-bold tracking-widest">{sev}</span>
                <div className={`w-2 h-2 rounded-full ${sev === 'Mild' ? 'bg-green-500' : sev === 'Moderate' ? 'bg-amber-500' : 'bg-error'} ${count > 0 ? 'animate-pulse' : ''}`} />
              </div>
              <span className="font-headline-lg text-headline-lg font-bold">{count}</span>
              <span className="text-caption ml-1 opacity-70">{count === 1 ? 'report' : 'reports'}</span>
              {count > 0 && (
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-current/20">
                  <Icon icon={statuses[sev].icon} size="xs" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">{statuses[sev].label}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Symptom Report Form */}
      <section className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl p-4 sm:p-6 md:p-8 border border-[var(--glass-border)] shadow-[0_0_20px_rgba(148,197,253,0.08)] mb-gutter">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[var(--neon-primary)]/15 flex items-center justify-center text-[var(--neon-primary)]">
            <Icon icon="edit_note" size="lg" />
          </div>
          <h3 className="font-headline-md text-headline-md">Report Your Symptoms</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-caption text-secondary">SYMPTOM</label>
            <PremiumInput placeholder="e.g. Fever, Cough, Headache" value={symptom} onChange={e => setSymptom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-caption text-secondary">SEVERITY</label>
            <div className="flex gap-2">
              {['Mild', 'Moderate', 'Severe'].map(s => (
                <button key={s} onClick={() => setSeverity(s)} className={`flex-1 py-3 rounded-lg border font-label-md transition-all min-h-[44px] ${severity === s ? 'bg-[var(--neon-primary)] text-white border-[var(--neon-primary)]' : 'border-[var(--glass-border)] hover:border-[var(--neon-primary)]'}`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-caption text-secondary">DURATION</label>
            <PremiumSelect value={duration} onChange={e => setDuration(e.target.value)}>
              <option value="">Select duration</option>
              <option value="Few hours">Few hours</option>
              <option value="1 day">1 day</option>
              <option value="2-3 days">2-3 days</option>
              <option value="1 week">1 week</option>
              <option value="2+ weeks">2+ weeks</option>
            </PremiumSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-label-md text-caption text-secondary">NOTES (optional)</label>
            <PremiumInput placeholder="Additional details..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={submitReport} className="w-full sm:w-auto bg-[var(--neon-primary)] text-white px-8 py-3 rounded-full font-label-md hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(148,197,253,0.2)] min-h-[44px]">
            <Icon icon="clinical_notes" size="lg" />
            Submit Report
          </button>
        </div>
      </section>

      {/* Symptom Tags */}
      {reports.length > 0 && (
        <section className="flex flex-nowrap overflow-x-auto gap-2 mb-stack-lg pb-2">
          {reports.slice(0, 5).map(r => (
            <span key={r.id} className={`px-4 py-2 rounded-full text-label-md font-label-md flex items-center gap-2 ${r.severity === 'Severe' ? 'bg-error/15 text-error border border-error/20' : r.severity === 'Moderate' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-[var(--neon-primary)]/15 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20'}`}>
              <Icon icon={r.severity === 'Severe' ? 'warning' : r.severity === 'Moderate' ? 'info' : 'check_circle'} size="sm" />
              {r.symptom}
            </span>
          ))}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 space-y-gutter">
          <section className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl p-4 md:p-8 lifted-card transition-all duration-700 opacity-100 translate-y-0 border border-[var(--glass-border)] shadow-[0_0_20px_rgba(148,197,253,0.08)]">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-[var(--neon-primary)]/15 flex items-center justify-center text-[var(--neon-primary)]">
                <Icon icon="psychology" size="xl" />
              </div>
              <h3 className="font-headline-md text-headline-md">Your Reports</h3>
            </div>
            {reports.length === 0 ? (
              <div className="space-y-4 text-on-surface-variant leading-relaxed font-body-md">
                <p>No symptoms have been reported yet. Use the form above to log your symptoms and get AI-powered guidance.</p>
                <div className="p-4 bg-[var(--neon-primary)]/5 border-l-4 border-[var(--neon-primary)] rounded-r-lg">
                  <p className="text-label-md font-label-md text-[var(--neon-primary)] mb-1">Key Insight</p>
                  <p className="text-body-md">Complete a symptom assessment to unlock personalized health insights.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(r => (
                  <div key={r.id} className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-lg p-4 border border-[var(--glass-border)] group">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-label-md text-label-md text-on-surface font-bold">{r.symptom}</h4>
                        <p className="text-caption text-secondary">{r.timestamp}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-0.5 rounded-full text-caption font-bold uppercase ${
                          r.severity === 'Severe' ? 'bg-error/15 text-error border border-error/20' :
r.severity === 'Moderate' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                          'bg-[var(--neon-primary)]/15 text-[var(--neon-primary)] border border-[var(--neon-primary)]/20'
                        }`}>{r.severity}</span>
                        <button
                          onClick={() => setReports(prev => prev.filter(x => x.id !== r.id))}
                          className="opacity-0 group-hover:opacity-100 text-secondary hover:text-error transition-all p-1 rounded-full hover:bg-error/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Icon icon="close" size="xs" />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-4 text-caption text-secondary">
                      <span>Duration: {r.duration}</span>
                      {r.notes && <span>Notes: {r.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="relative h-[240px] rounded-xl overflow-hidden group">
            <img
              alt="Medical professional reviewing digital health data"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAKXdX56RArmULZK_NoQ0L99HNEH3Smr4pCogZr1zloxe29vQZoB26L8Iu78idg7ZwHHUDKRyrKxSMcQWXPY2GAyGcUU_L5ikTUELOgPKOWXEE9Tb7l9pndYlQwpmnKXA5JJdpiAQwriLBBeAT0YoPgHW3irIWbiaGoOPswqOnYqvrc4_ts2NWwIzdymky9Sr03DYK7taoPrRNvjZihhWh501vmdR2fLafOADCKSzevfmE2SFGH3N4vyy5sxGrLAqa6CZyr0Qwj3n4"
            />
            <div className="absolute inset-0 bg-black/50 flex items-end p-6">
              <p className="text-white font-label-md">Your care details and AI triage insights will appear here.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-gutter">
          <section className="bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl p-4 md:p-6 border border-[var(--glass-border)] shadow-[0_0_20px_rgba(148,197,253,0.08)] h-full">
            <div className="flex items-center gap-3 mb-6">
              <Icon icon="assignment_turned_in" size="lg" className="text-[var(--neon-primary)]" />
              <h3 className="font-headline-md text-headline-md">Next Steps</h3>
            </div>
            <ul className="space-y-6">
              {[
                'Log your symptoms in the <strong class="text-[var(--neon-primary)]">report form</strong> above to get AI-powered guidance.',
                'Use the <strong>Symptom Tracker</strong> to monitor and record your health daily.',
                'Set up medication reminders and track your prescriptions.',
                'Review your <strong>Medical History</strong> and update your conditions.',
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--neon-primary)] text-white flex items-center justify-center font-bold text-sm">{i + 1}</div>
                  <p className="text-body-md" dangerouslySetInnerHTML={{ __html: step }} />
                </li>
              ))}
            </ul>

            <div className="mt-10 pt-6 border-t border-[var(--glass-border)] flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-label-md text-label-md text-on-surface">Follow-up Reminder</span>
                <span className="text-caption text-secondary">Notify me after my next session</span>
              </div>
              <button onClick={() => setFollowUp(!followUp)} className={'relative inline-flex h-6 w-12 items-center rounded-full transition-colors ' + (followUp ? 'bg-[var(--neon-primary)]' : 'bg-[var(--glass-border)]')}>
                <span className={'inline-block h-5 w-5 transform rounded-full bg-white border-2 border-[var(--glass-border)] transition-transform ' + (followUp ? 'translate-x-6' : 'translate-x-0.5')} />
              </button>
            </div>
          </section>
        </div>
      </div>

      <footer className="mt-stack-lg flex flex-col md:flex-row items-center justify-between p-4 md:p-6 bg-[var(--glass-bg)] backdrop-blur-xl rounded-xl gap-4 border border-[var(--glass-border)]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[var(--neon-primary)]/10 rounded-lg">
              <Icon icon="verified_user" size="lg" className="text-[var(--neon-primary)]" />
          </div>
          <div>
            <h4 className="font-label-md text-label-md">Medical Disclaimer</h4>
            <p className="text-caption text-secondary">This analysis is AI-driven and for informational purposes only. In case of emergency, call local medical services immediately.</p>
          </div>
        </div>
        <button onClick={() => navigate('/new-triage')} className="w-full md:w-auto px-10 py-4 bg-[var(--neon-primary)] text-white rounded-full font-label-md text-label-md flex items-center justify-center gap-2 hover:opacity-90 transition-all transform active:scale-95 shadow-[0_0_20px_rgba(148,197,253,0.25)] min-h-[44px]">
          <Icon icon="add" size="md" />
          Start New Triage
        </button>
      </footer>
    </main>
  )
}
