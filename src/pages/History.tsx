import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'
import { PremiumDateInput, PremiumInput, PremiumSelect, PremiumTextarea } from '../components/ui/PremiumFormControls'
import { usePersistState } from '../hooks/usePersistState'
import { api } from '../services/api'

type Tab = 'sessions' | 'medical'

type Condition = 'Hypertension' | 'Type 2 Diabetes' | 'Asthma' | 'Heart Disease' | 'Thyroid Disorder'
const conditionsList: Condition[] = ['Hypertension', 'Type 2 Diabetes', 'Asthma', 'Heart Disease', 'Thyroid Disorder']

interface Medication {
  name: string
  dosage: string
  frequency: string
}

const sessionFilters = ['All Sessions', 'Low', 'Moderate', 'High']

const severityConfig: Record<string, { severityClass: string; severityIcon: string }> = {
  Urgent: { severityClass: 'bg-error/15 text-error border border-error/20', severityIcon: 'warning' },
  Moderate: { severityClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/20', severityIcon: 'info' },
  Stable: { severityClass: 'bg-primary/15 text-primary border border-primary/20', severityIcon: 'check_circle' },
}

const tabs: { key: Tab; label: string; icon: string }[] = [
  { key: 'sessions', label: 'Triage Sessions', icon: 'history' },
  { key: 'medical', label: 'Medical History', icon: 'assignment' },
]

interface BackendTriage {
  _id: string
  symptoms: string[]
  duration: string
  severity: 'Mild' | 'Moderate' | 'Severe'
  notes?: string
  triageStatus: { level: 'Emergency' | 'Urgent' | 'Non-Urgent' }
  actionPlan: string
  createdAt: string
}

function severityLabel(level: string): string {
  if (level === 'Emergency' || level === 'Urgent') return 'Urgent'
  if (level === 'Moderate') return 'Moderate'
  return 'Stable'
}

function SessionsView() {
  const navigate = useNavigate()
  const { sessions } = useAuth()
  const [backendSessions, setBackendSessions] = useState<BackendTriage[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All Sessions')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    api.get<{ msg: string; data: BackendTriage[] }>('/triage/list')
      .then(res => setBackendSessions(res.data || []))
      .catch(() => {/* fall back to local sessions */})
      .finally(() => setLoadingHistory(false))
  }, [])

  const allSessions = (() => {
    const map = new Map<string, any>()
    backendSessions.forEach(s => {
      map.set(s._id, {
        id: s._id,
        condition: s.symptoms.join(', '),
        description: s.actionPlan,
        date: new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        time: new Date(s.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        severity: severityLabel(s.triageStatus.level) as 'Urgent' | 'Moderate' | 'Stable',
        statusLabel: s.triageStatus.level,
        statusIcon: s.triageStatus.level === 'Emergency' ? 'warning' : s.triageStatus.level === 'Urgent' ? 'info' : 'check_circle',
        tags: [s.severity, `Duration: ${s.duration}`],
      })
    })
    sessions.forEach(s => {
      if (!map.has(s.id)) {
        map.set(s.id, s)
      }
    })
    return Array.from(map.values())
  })()

  const filteredSessions = activeFilter === 'All Sessions'
    ? allSessions
    : allSessions.filter(s => {
        if (activeFilter === 'Low') return s.severity === 'Stable'
        if (activeFilter === 'Moderate') return s.severity === 'Moderate'
        if (activeFilter === 'High') return s.severity === 'Urgent'
        return true
      })

  const urgentCount = allSessions.filter(s => s.severity === 'Urgent').length

  return (
    <section className="max-w-container-max-width w-full mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 mb-6 md:mb-10">
        <div className="overflow-x-auto w-full md:w-auto">
          <div className="flex p-1 bg-surface rounded-full border border-outline-variant w-max">
            {sessionFilters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={
                  activeFilter === f
                    ? 'px-6 py-2 rounded-full font-label-md text-label-md bg-primary text-on-primary transition-all shadow-sm/20'
                    : 'px-6 py-2 rounded-full font-label-md text-label-md text-secondary hover:text-primary transition-all'
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-4 flex-wrap">
          <div className="px-5 py-3 bg-surface rounded-xl border border-outline-variant flex flex-col">
            <span className="font-caption text-caption text-secondary uppercase tracking-wider">Total Triage</span>
            <span className="font-headline-md text-headline-md text-primary">{allSessions.length}</span>
          </div>
          <div className="px-5 py-3 bg-error/10 rounded-xl border border-error/20 flex flex-col">
            <span className="font-caption text-caption text-error uppercase tracking-wider">Urgent Alerts</span>
            <span className="font-headline-md text-headline-md text-error">{urgentCount}</span>
          </div>
        </div>
      </div>

      {loadingHistory ? (
        <div className="flex justify-center py-20"><span className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-outline-variant p-14 text-center">
          <div className="w-20 h-20 mx-auto mb-5 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Icon icon="history" size="2xl" />
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">No triage history</h3>
          <p className="font-body-md text-body-md text-secondary max-w-md mx-auto mb-6">
            {activeFilter === 'All Sessions'
              ? 'Your completed triage sessions will appear here. Start a new session to begin.'
              : `No sessions match "${activeFilter}" severity.`}
          </p>
          <button onClick={() => navigate('/new-triage')} className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-label-md text-label-md hover:opacity-90 transition-colors shadow-lg/20 min-h-[44px]">
            <Icon icon="add" size="md" />
            Start New Triage
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map(s => {
            const config = severityConfig[s.severity] || { severityClass: 'bg-surface text-secondary', severityIcon: 'info' }
            return (
              <div
                key={s.id}
                className="bg-surface p-4 md:p-6 rounded-xl border border-outline-variant flex flex-col lg:flex-row items-start lg:items-center gap-4 md:gap-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg/5"
              >
                <div className="flex flex-col min-w-[120px]">
                  <span className="font-label-md text-label-md text-primary">{s.date}</span>
                  <span className="font-caption text-caption text-secondary">{s.time}</span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-primary/10 rounded-full text-primary font-label-md text-label-md border border-primary/20">
                      {s.condition}
                    </span>
                    <span className={`px-3 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 ${config.severityClass}`}>
                      <Icon icon={config.severityIcon} size="xs" />
                      {s.severity}
                    </span>
                  </div>
                  <p className="text-on-surface-variant font-body-md line-clamp-1">{s.description}</p>
                </div>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                  <button onClick={() => navigate('/care-details')} className="flex-1 lg:flex-none px-6 py-3 border border-primary text-primary font-label-md text-label-md rounded-full hover:bg-primary/10 transition-colors min-h-[44px]">
                    View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {allSessions.length > 0 && (
        <div className="mt-12 flex justify-center">
          <nav className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} className="w-11 h-11 flex items-center justify-center rounded-lg bg-surface border border-outline-variant hover:bg-primary/10 transition-colors text-secondary min-h-[44px]">
              <Icon icon="chevron_left" size="md" />
            </button>
            {[1, 2, 3].map(p => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={
                  currentPage === p
                    ? 'w-11 h-11 flex items-center justify-center rounded-lg bg-primary text-on-primary font-label-md text-label-md shadow-lg/20 min-h-[44px]'
                    : 'w-11 h-11 flex items-center justify-center rounded-lg bg-surface border border-outline-variant hover:bg-primary/10 transition-colors font-label-md text-label-md min-h-[44px]'
                }
              >
                {p}
              </button>
            ))}
            <button onClick={() => setCurrentPage(Math.min(3, currentPage + 1))} className="w-11 h-11 flex items-center justify-center rounded-lg bg-surface border border-outline-variant hover:bg-primary/10 transition-colors text-secondary min-h-[44px]">
              <Icon icon="chevron_right" size="md" />
            </button>
          </nav>
        </div>
      )}
    </section>
  )
}

function MedicalForm() {
  const navigate = useNavigate()
  const [selectedConditions, setSelectedConditions] = usePersistState<Condition[]>('doctarr_conditions', [])
  const [customConditions, setCustomConditions] = usePersistState<string[]>('doctarr_custom_conditions', [])
  const [allergies, setAllergies] = usePersistState<string[]>('doctarr_allergies', [])
  const [allergyInput, setAllergyInput] = useState('')
  const [medications, setMedications] = usePersistState<Medication[]>('doctarr_medications', [])
  const [emergencyContact, setEmergencyContact] = usePersistState('doctarr_emergency_contact', '')
  const [pastSurgeries, setPastSurgeries] = usePersistState('doctarr_surgeries', '')
  const [dob, setDob] = usePersistState('doctarr_dob', '')
  const [bloodType, setBloodType] = usePersistState('doctarr_blood_type', '')
  const [showCustomCondition, setShowCustomCondition] = useState(false)
  const [customConditionInput, setCustomConditionInput] = useState('')
  const [saved, setSaved] = useState(false)

  const toggleCondition = (condition: Condition) => {
    setSelectedConditions(prev =>
      prev.includes(condition) ? prev.filter(c => c !== condition) : [...prev, condition]
    )
  }

  const addCustomCondition = () => {
    const t = customConditionInput.trim()
    if (t && !customConditions.includes(t)) {
      setCustomConditions([...customConditions, t])
      setCustomConditionInput('')
      setShowCustomCondition(false)
    }
  }

  const removeCustomCondition = (c: string) => {
    setCustomConditions(customConditions.filter(x => x !== c))
  }

  const addAllergy = () => {
    const trimmed = allergyInput.trim()
    if (trimmed && !allergies.includes(trimmed)) {
      setAllergies([...allergies, trimmed])
      setAllergyInput('')
    }
  }

  const removeAllergy = (allergy: string) => {
    setAllergies(allergies.filter(a => a !== allergy))
  }

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    setMedications(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m))
  }

  const addMedication = () => {
    setMedications(prev => [...prev, { name: '', dosage: '', frequency: '' }])
  }

  const removeMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <section className="max-w-container-max-width w-full mx-auto">
      {saved && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
          <Icon icon="check_circle" size="lg" className="text-success icon-fill" />
          <p className="font-body-md text-success">Your medical history has been saved successfully.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 md:p-8 space-y-12">
          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Icon icon="badge" size="sm" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Personal Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2" htmlFor="hist-dob">
                  Date of Birth <span className="text-error">*</span>
                </label>
                <PremiumDateInput id="hist-dob" value={dob} onChange={e => setDob(e.target.value)} required />
              </div>
              <div>
                <label className="block font-label-md text-label-md text-on-surface-variant mb-2" htmlFor="hist-blood">Blood Type</label>
                <PremiumSelect id="hist-blood" value={bloodType} onChange={e => setBloodType(e.target.value)}>
                  <option value="">Select Blood Type</option>
                  <option value="a+">A+</option>
                  <option value="a-">A-</option>
                  <option value="b+">B+</option>
                  <option value="b-">B-</option>
                  <option value="ab+">AB+</option>
                  <option value="ab-">AB-</option>
                  <option value="o+">O+</option>
                  <option value="o-">O-</option>
                  <option value="unknown">Unknown</option>
                </PremiumSelect>
              </div>
              <div className="md:col-span-2">
                <label className="block font-label-md text-label-md text-error mb-2" htmlFor="hist-emergency">
                  Emergency Contact Number <span className="text-error">*</span>
                </label>
                <PremiumInput tone="danger" id="hist-emergency" type="tel" placeholder="(555) 000-0000" value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} />
                {!emergencyContact && (
                  <p className="font-caption text-caption text-error mt-1 flex items-center gap-1">
                    <Icon icon="error" size="xs" />
                    This field is recommended.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Icon icon="vital_signs" size="sm" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Existing Conditions</h3>
            </div>
            <p className="font-body-md text-on-surface-variant mb-4">Select all chronic conditions that apply.</p>
            <div className="flex flex-wrap gap-3">
              {conditionsList.map(condition => (
                <button
                  key={condition}
                  type="button"
                  onClick={() => toggleCondition(condition)}
                  className={`px-4 py-2 rounded-full font-label-md text-label-md transition-all cursor-pointer min-h-[44px] ${
                    selectedConditions.includes(condition)
                      ? 'border border-primary bg-primary/15 text-primary'
                      : 'border border-outline-variant bg-surface text-on-surface-variant hover:border-primary/30'
                  }`}
                >
                  {condition}
                </button>
              ))}
              {customConditions.map(c => (
                <span key={c} className="px-4 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary font-label-md text-label-md flex items-center gap-2">
                  {c}
                  <button type="button" onClick={() => removeCustomCondition(c)} className="hover:text-error transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <Icon icon="close" size="xs" />
                  </button>
                </span>
              ))}
              {!showCustomCondition ? (
                <button onClick={() => setShowCustomCondition(true)} className="px-4 py-2 rounded-full border border-dashed border-primary/50 text-primary font-label-md text-label-md flex items-center gap-1 hover:bg-primary/10 transition-colors min-h-[44px]" type="button">
                  <Icon icon="add" size="sm" /> Add Other
                </button>
              ) : (
                <div className="flex gap-2 items-center flex-wrap">
                  <PremiumInput compact containerClassName="min-w-0 flex-1" placeholder="Condition name" value={customConditionInput} onChange={e => setCustomConditionInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCondition() } }} />
                  <button onClick={addCustomCondition} className="bg-primary text-on-primary px-3 py-2 rounded-lg font-label-md text-sm min-h-[44px]" type="button">Add</button>
                  <button onClick={() => { setShowCustomCondition(false); setCustomConditionInput('') }} className="text-secondary px-2 py-2 text-sm min-h-[44px]" type="button">Cancel</button>
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
              <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center text-error border border-error/20">
                <Icon icon="warning" size="sm" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Allergies</h3>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {allergies.map(allergy => (
                <div key={allergy} className="px-4 py-2 rounded-full border border-error/30 bg-error/10 text-error font-label-md text-label-md flex items-center gap-2">
                  {allergy}
                  <button aria-label={`Remove ${allergy}`} className="hover:text-error transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" type="button" onClick={() => removeAllergy(allergy)}>
                    <Icon icon="close" size="sm" />
                  </button>
                </div>
              ))}
              {allergies.length === 0 && <p className="font-body-md text-secondary text-sm">No allergies listed.</p>}
            </div>
            <div className="flex gap-2 max-w-full">
              <PremiumInput compact containerClassName="flex-1 min-w-0" placeholder="Type allergy to add..." type="text" value={allergyInput} onChange={e => setAllergyInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addAllergy() } }} />
              <button className="bg-surface text-on-surface border border-outline-variant px-4 py-2 rounded-lg font-label-md hover:bg-primary/10 transition-colors min-h-[44px]" type="button" onClick={addAllergy}>Add</button>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Icon icon="prescriptions" size="sm" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Current Medications</h3>
            </div>
            <div className="space-y-3 mb-4">
              {medications.length === 0 ? (
                <p className="py-8 text-center text-secondary font-body-md bg-surface rounded-xl border border-outline-variant">No medications added yet.</p>
              ) : (
                medications.map((med, i) => (
                  <div key={i} className="bg-surface border border-outline-variant rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-primary/20 transition-colors">
                    <div className="flex-1 min-w-0">
                      <PremiumInput compact variant="inline" placeholder="Medication name" value={med.name} onChange={e => updateMedication(i, 'name', e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <PremiumInput compact variant="inline" placeholder="e.g. 10mg" value={med.dosage} onChange={e => updateMedication(i, 'dosage', e.target.value)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <PremiumInput compact variant="inline" placeholder="e.g. Once daily" value={med.frequency} onChange={e => updateMedication(i, 'frequency', e.target.value)} />
                    </div>
                    <button onClick={() => removeMedication(i)} aria-label="Delete row" className="text-secondary hover:text-error transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0" type="button">
                      <Icon icon="delete" size="md" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button onClick={addMedication} className="px-4 py-2 rounded-full border border-dashed border-primary/50 text-primary font-label-md text-label-md flex items-center gap-1 hover:bg-primary/10 transition-colors min-h-[44px]" type="button">
              <Icon icon="add" size="sm" /> Add Medication
            </button>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Icon icon="content_cut" size="sm" />
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Past Surgeries</h3>
            </div>
            <PremiumTextarea placeholder="List any past surgeries and approximate dates..." rows={4} value={pastSurgeries} onChange={e => setPastSurgeries(e.target.value)} />
          </section>
        </div>

        <div className="bg-surface p-6 md:p-8 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Icon icon="lock" size="md" className="text-primary" />
            <p className="font-caption text-caption">Your health details are kept private and only used to personalise your triage.</p>
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 shadow-lg/20 transition-all text-center min-h-[44px]" type="submit">
              Save Medical History
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}

export default function History() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') === 'medical' ? 'medical' : 'sessions'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)

  return (
    <main className="min-h-screen flex flex-col bg-surface p-4 md:p-6 overflow-x-hidden">
      <div className="overflow-x-auto mb-8 flex-shrink-0">
        <div className="flex p-1 bg-surface rounded-full border border-outline-variant w-max">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={
                activeTab === tab.key
                  ? 'px-4 md:px-6 py-2 rounded-full font-label-md text-label-md bg-primary text-on-primary transition-all shadow-sm/20 flex items-center gap-2 whitespace-nowrap min-h-[44px]'
                  : 'px-4 md:px-6 py-2 rounded-full font-label-md text-label-md text-secondary hover:text-primary transition-all flex items-center gap-2 whitespace-nowrap min-h-[44px]'
              }
            >
              <Icon icon={tab.icon} size="sm" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'sessions' ? <SessionsView /> : <MedicalForm />}
      </div>
    </main>
  )
}
