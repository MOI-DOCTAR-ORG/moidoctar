import { useState, useEffect, useCallback } from 'react'
import Icon from '../components/Icon'
import { PremiumInput, PremiumSelect, PremiumTimeInput } from '../components/ui/PremiumFormControls'
import { api } from '../services/api'
import { useToastContext } from '../context/ToastContext'

interface BackendMedication {
  id: string
  name: string
  dosage: string
  time: string
  frequent: 'morning' | 'afternoon' | 'night'
  supply: string
  status: boolean
  startedAt: string
  stoppedAt?: string
}

const freqConfig: Record<string, { icon: string; label: string }> = {
  morning: { icon: 'light_mode', label: 'Morning' },
  afternoon: { icon: 'wb_sunny', label: 'Afternoon' },
  night: { icon: 'bedtime', label: 'Night' },
}

const TAKEN_KEY = `doctarr_taken_${new Date().toDateString()}`

function loadTaken(): Record<string, boolean> {
  try { return JSON.parse(sessionStorage.getItem(TAKEN_KEY) || '{}') } catch { return {} }
}
function saveTaken(taken: Record<string, boolean>) {
  try { sessionStorage.setItem(TAKEN_KEY, JSON.stringify(taken)) } catch {}
}

export default function MedicationTracker() {
  const { addToast } = useToastContext()
  const [medications, setMedications] = useState<BackendMedication[]>([])
  const [taken, setTaken] = useState<Record<string, boolean>>(loadTaken)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [medName, setMedName] = useState('')
  const [medDosage, setMedDosage] = useState('')
  const [medTime, setMedTime] = useState('08:00')
  const [medFrequency, setMedFrequency] = useState<'morning' | 'afternoon' | 'night'>('morning')
  const [medSupply, setMedSupply] = useState('30')

  const fetchMedications = useCallback(async () => {
    try {
      const res = await api.get<{ msg: string; data: BackendMedication[] }>('/medication')
      setMedications(res.data || [])
    } catch {
      addToast('Could not load medications.', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { fetchMedications() }, [fetchMedications])

  const toggleTaken = (id: string) => {
    setTaken(prev => {
      const updated = { ...prev, [id]: !prev[id] }
      saveTaken(updated)
      return updated
    })
  }

  const addMedication = async () => {
    if (!medName.trim() || !medDosage.trim()) return
    const timeDisplay = new Date(`2000-01-01T${medTime}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    setSaving(true)
    try {
      const res = await api.post<{ msg: string; data: BackendMedication[] }>(
        '/medication/create',
        { name: medName.trim(), dosage: medDosage.trim(), time: timeDisplay, frequent: medFrequency, supply: medSupply }
      )
      setMedications(res.data || [])
      setMedName(''); setMedDosage(''); setMedSupply('30'); setMedFrequency('morning'); setMedTime('08:00')
      setShowForm(false)
      addToast('Medication added successfully.', 'success')
    } catch {
      addToast('Could not save medication.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const stopMedication = async (id: string) => {
    try {
      const res = await api.put<{ msg: string; data: BackendMedication[] }>('/medication/stop', { medicationId: id })
      setMedications(res.data || [])
      addToast('Medication stopped.', 'success')
    } catch {
      addToast('Could not stop medication.', 'error')
    }
  }

  const active = medications.filter(m => m.status)
  const scheduleGroups = (['morning', 'afternoon', 'night'] as const).map(freq => ({
    freq,
    items: active.filter(m => m.frequent === freq),
  })).filter(g => g.items.length > 0)

  return (
    <main className="flex-1 flex flex-col h-full min-h-[100dvh] overflow-y-auto relative z-10 w-full bg-background font-body-md text-on-surface antialiased">
      <div className="flex-1 p-margin-mobile md:p-stack-lg max-w-container-max-width mx-auto w-full pb-32 md:pb-stack-lg">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
          <div>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-bold text-on-surface tracking-tight">Medication Tracker</h2>
            <p className="font-body-md text-body-md text-secondary mt-1">Manage your prescriptions and daily schedule.</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bg-primary text-on-primary hover:opacity-90 font-label-md text-label-md py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-colors self-start md:self-auto min-h-[44px]">
            <Icon icon={showForm ? 'close' : 'add'} size="md" />
            {showForm ? 'Cancel' : 'Add Medication'}
          </button>
        </div>

        {showForm && (
          <div className="bg-surface rounded-xl border border-outline-variant p-6 mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">New Medication</h3>
            {/* OTC addendum, sections 9–10: this records instructions a health worker or the label gave;
                it never suggests, calculates or changes a dose. */}
            <p className="mb-4 flex items-start gap-2 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-caption text-on-surface-variant">
              <Icon icon="info" size="sm" className="mt-px shrink-0" />
              Record the dose exactly as your health worker, prescription or medicine label says. Moi Doctar does not
              choose or change doses. Medication guidance is currently under medical review.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-caption text-secondary">Medication Name</label>
                <PremiumInput placeholder="e.g. Lisinopril" value={medName} onChange={e => setMedName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-caption text-secondary">Dose (as prescribed or on the label)</label>
                <PremiumInput placeholder="Copy it from your prescription or label" value={medDosage} onChange={e => setMedDosage(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-caption text-secondary">Time</label>
                <PremiumTimeInput value={medTime} onChange={e => setMedTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-caption text-secondary">Frequency</label>
                <PremiumSelect value={medFrequency} onChange={e => setMedFrequency(e.target.value as typeof medFrequency)}>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="night">Night</option>
                </PremiumSelect>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-label-md text-caption text-secondary">Supply (pills)</label>
                <PremiumInput type="number" min="1" value={medSupply} onChange={e => setMedSupply(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button onClick={addMedication} disabled={saving || !medName.trim() || !medDosage.trim()} className="w-full bg-primary text-on-primary py-3 rounded-lg font-label-md hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 min-h-[44px]">
                  {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Icon icon="check_circle" size="md" />}
                  Save Medication
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* Today's Schedule */}
            <div className="lg:col-span-4 flex flex-col gap-gutter">
              <div className="bg-surface rounded-xl border border-outline-variant p-4 md:p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-headline-md text-headline-md text-on-surface">Today's Schedule</h3>
                  <span className="bg-surface text-on-surface font-label-md text-label-md px-3 py-1 rounded-full text-xs border border-outline-variant">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </div>
                {active.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-secondary font-body-md text-center">No medications scheduled. Add your first medication to get started.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 flex-1">
                    {scheduleGroups.map(({ freq, items }) => (
                      <div key={freq}>
                        <h4 className="font-caption text-caption text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Icon icon={freqConfig[freq].icon} size="sm" /> {freqConfig[freq].label}
                        </h4>
                        <div className="flex flex-col gap-3">
                          {items.map(item => (
                            <label key={item.id} onClick={() => toggleTaken(item.id)} className="flex items-start gap-3 p-3 rounded-lg border border-outline-variant bg-surface hover:bg-primary/10 transition-colors cursor-pointer group">
                              <div className="pt-0.5">
                                <input type="checkbox" checked={!!taken[item.id]} onChange={() => {}} className="w-5 h-5 rounded border-outline text-green-500 focus:ring-primary transition-colors" />
                              </div>
                              <div className="flex-1">
                                <p className="font-label-md text-label-md text-on-surface group-hover:text-primary transition-colors">{item.name}</p>
                                <p className="font-caption text-caption text-secondary">{item.time}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Active Prescriptions */}
            <div className="lg:col-span-8 flex flex-col gap-gutter">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-headline-md text-headline-md text-on-surface">Active Prescriptions</h3>
              </div>
              {active.length === 0 ? (
                <div className="bg-surface rounded-xl border border-outline-variant p-12 flex flex-col items-center justify-center text-center">
                  <Icon icon="medication" size="2xl" className="text-outline-variant mb-4" />
                  <p className="font-body-md text-secondary">No active prescriptions yet.</p>
                  <p className="font-caption text-caption text-outline-variant mt-1">Add medications to track your prescriptions and refill schedule.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-gutter">
                  {active.map(med => {
                    const supplyNum = parseInt(med.supply) || 0
                    const cfg = freqConfig[med.frequent]
                    return (
                      <div key={med.id} className="bg-surface rounded-xl border border-outline-variant p-4 md:p-6 flex flex-col hover:border-primary/50 transition-colors group relative overflow-hidden">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors border border-outline-variant">
                              <Icon icon="medication" size="lg" />
                            </div>
                            <div>
                              <h4 className="font-label-md text-label-md text-on-surface text-lg">{med.name}</h4>
                              <p className="font-caption text-caption text-secondary">{med.dosage}</p>
                            </div>
                          </div>
                          <button onClick={() => stopMedication(med.id)} className="opacity-0 group-hover:opacity-100 p-1 text-secondary hover:text-error transition-all min-h-[44px] min-w-[44px] flex items-center justify-center" title="Stop medication">
                            <Icon icon="stop_circle" size="md" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6">
                          <span className="inline-flex items-center gap-1 bg-surface text-on-surface-variant font-caption text-caption px-3 py-1 rounded-full border border-outline-variant">
                            <Icon icon={cfg.icon} size="xs" /> {cfg.label}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-surface text-on-surface-variant font-caption text-caption px-3 py-1 rounded-full border border-outline-variant">
                            <Icon icon="schedule" size="xs" /> {med.time}
                          </span>
                        </div>
                        <div className="mt-auto">
                          <div className="flex justify-between items-end mb-2">
                            <span className="font-caption text-caption text-secondary">Supply</span>
                            <span className="font-label-md text-label-md text-on-surface">{med.supply} pills</span>
                          </div>
                          <div className="w-full bg-outline-variant rounded-full h-2 overflow-hidden">
                            <div className="h-2 rounded-full bg-primary" style={{ width: supplyNum > 0 ? `${Math.min((supplyNum / 90) * 100, 100)}%` : '100%' }} />
                          </div>
                          <p className="font-caption text-caption text-secondary mt-2">Started {new Date(med.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
