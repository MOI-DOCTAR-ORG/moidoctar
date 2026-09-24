import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToastContext } from '../context/ToastContext'
import Icon from '../components/Icon'
import { PremiumDateInput, PremiumSelect, premiumControlClass } from '../components/ui/PremiumFormControls'
import { scopeKey } from '../utils/storage'
import { api } from '../services/api'
import {
  type PatientProfile,
  type Medication,
  createDefaultProfile,
  calculateCompletion,
  loadProfile,
  saveProfile as persistProfile,
} from '../types/profile'

const STORAGE_KEY = 'doctarr_patient_profile'

const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const genotypeOptions = ['AA', 'AS', 'SS', 'AC', 'SC', 'CC']
const stateOptions = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

function getInitialsForProfile(profile: PatientProfile): string {
  const parts = profile.fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return `${parts[0][0].toUpperCase()}${parts[parts.length - 1][0].toUpperCase()}`
}

function getDefaultForm(): PatientProfile {
  return createDefaultProfile()
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { addToast } = useToastContext()

  const getScopedKey = useCallback(() => scopeKey(STORAGE_KEY), [])

  const [form, setForm] = useState<PatientProfile>(getDefaultForm)
  const [originalForm, setOriginalForm] = useState<PatientProfile>(getDefaultForm)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const [sectionsOpen, setSectionsOpen] = useState({
    basic: true,
    contact: true,
    medical: true,
    emergency: true,
    appSpecific: true,
  })

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordConfirmValue, setPasswordConfirmValue] = useState('')
  const [passwordConfirmError, setPasswordConfirmError] = useState('')
  const pendingSaveRef = useRef(false)

  const [newAllergy, setNewAllergy] = useState('')
  const [newCondition, setNewCondition] = useState('')
  const [newMedication, setNewMedication] = useState<Medication>({ name: '', dosage: '', frequency: '' })

  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    const scopedKey = getScopedKey()
    const existing = loadProfile(scopedKey)
    if (existing) {
      setForm(existing)
      setOriginalForm(JSON.parse(JSON.stringify(existing)))
    } else {
      const fresh = getDefaultForm()
      if (user) {
        fresh.fullName = user.userName
        fresh.email = user.email
        fresh.patientId = user._id
        fresh.registeredDate = user.createdAt
          ? new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
          : ''
      }
      setForm(fresh)
      setOriginalForm(JSON.parse(JSON.stringify(fresh)))
    }
  }, [getScopedKey, user])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const updateField = useCallback(<K extends keyof PatientProfile>(field: K, value: PatientProfile[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }, [])

  const toggleSection = useCallback((section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const completion = calculateCompletion(form)

  const addAllergy = () => {
    const v = newAllergy.trim()
    if (v && !form.knownAllergies.includes(v)) {
      updateField('knownAllergies', [...form.knownAllergies, v])
      setNewAllergy('')
    }
  }

  const removeAllergy = (a: string) => {
    updateField('knownAllergies', form.knownAllergies.filter(x => x !== a))
  }

  const addCondition = () => {
    const v = newCondition.trim()
    if (v && !form.chronicConditions.includes(v)) {
      updateField('chronicConditions', [...form.chronicConditions, v])
      setNewCondition('')
    }
  }

  const removeCondition = (c: string) => {
    updateField('chronicConditions', form.chronicConditions.filter(x => x !== c))
  }

  const addMedication = () => {
    if (!newMedication.name.trim() || !newMedication.dosage.trim() || !newMedication.frequency.trim()) return
    updateField('currentMedications', [...form.currentMedications, { ...newMedication }])
    setNewMedication({ name: '', dosage: '', frequency: '' })
  }

  const removeMedication = (i: number) => {
    updateField('currentMedications', form.currentMedications.filter((_, idx) => idx !== i))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      addToast('Please upload a PNG, JPEG, or WebP image.', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB.', 'error')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateField('photo', reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    updateField('photo', null)
  }

  const doSave = useCallback(async () => {
    const scopedKey = getScopedKey()
    persistProfile(scopedKey, form)

    try { localStorage.setItem(scopeKey('doctarr_name'), form.fullName) } catch {}
    try { localStorage.setItem(scopeKey('doctarr_email'), form.email) } catch {}

    if (form.email !== originalForm.email) {
      try { localStorage.setItem('doctarr_current_user_email', form.email) } catch {}
    }

    // Sync core fields to backend
    try {
      await api.put('/user/updateProfile', {
        userName: form.fullName,
        phone: form.phoneNumber || undefined,
        demographics: {
          gender: form.gender?.toLowerCase() || undefined,
          age: form.dateOfBirth || undefined,
          bloodType: form.bloodGroup || undefined,
          country: form.state || undefined,
        },
      })
    } catch { /* localStorage save still succeeded */ }

    setOriginalForm(JSON.parse(JSON.stringify(form)))
    setDirty(false)
    setSaving(false)
    addToast('Profile saved successfully.', 'success')
  }, [form, originalForm, getScopedKey, addToast])

  const handleSave = () => {
    if (!form.fullName.trim()) {
      addToast('Full name is required.', 'error')
      return
    }
    if (!form.email.trim()) {
      addToast('Email is required.', 'error')
      return
    }

    if (form.email !== originalForm.email) {
      pendingSaveRef.current = true
      setShowPasswordModal(true)
      return
    }

    setSaving(true)
    doSave()
  }

  const handlePasswordConfirm = () => {
    if (!passwordConfirmValue.trim()) {
      setPasswordConfirmError('Please enter your current password.')
      return
    }
    setPasswordConfirmError('')
    setPasswordConfirmValue('')
    setShowPasswordModal(false)
    setSaving(true)
    doSave()
  }

  const scopedKey = scopeKey(STORAGE_KEY)

  function inputClass(error?: string) {
    return premiumControlClass({ tone: error ? 'danger' : 'default' })
  }

  function badgeClass() {
    return 'bg-surface border border-outline-variant px-3 py-1 rounded-full text-label-md font-label-md text-on-surface flex items-center gap-2'
  }

  return (
    <main className="min-h-[100dvh] flex flex-col items-center">
      <div className="max-w-[900px] w-full px-4 md:px-gutter py-stack-lg flex flex-col gap-gutter">
        {dirty && (
          <div className="self-end inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-caption text-amber-400 border border-amber-500/20">
            <Icon icon="edit_note" size="sm" />
            Unsaved
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-surface border border-outline-variant rounded-xl p-4 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6">
            {/* Photo */}
            <div className="relative group">
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-primary/15 text-primary flex items-center justify-center text-4xl font-extrabold border-4 border-outline-variant overflow-hidden">
                {form.photo ? (
                  <img src={form.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{getInitialsForProfile(form)}</span>
                )}
              </div>
              <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer flex items-center justify-center transition-opacity">
                <Icon icon="camera_alt" size="xl" className="text-white" />
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </label>
              {form.photo && (
                <button
                  onClick={removePhoto}
                  className="absolute -top-1 -right-1 w-7 h-7 bg-error text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 transition-colors"
                >
                  <Icon icon="close" size="sm" />
                </button>
              )}
            </div>

            {/* Name / Email / Completion */}
            <div className="flex-1 text-center md:text-left w-full">
              <input
                className="text-center md:text-left font-headline-md text-headline-md font-bold text-on-surface bg-transparent border-b-2 border-transparent focus:border-primary outline-none w-full mb-1 transition-colors"
                value={form.fullName}
                onChange={e => updateField('fullName', e.target.value)}
                placeholder="Your full name"
              />
              <input
                className="text-center md:text-left font-body-md text-secondary bg-transparent border-b-2 border-transparent focus:border-primary outline-none w-full mb-4 transition-colors"
                type="email"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
                placeholder="your.email@example.com"
              />

              {/* Completion bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-outline-variant rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      completion === 100 ? 'bg-green-500' : 'bg-primary'
                    }`}
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <span className="text-caption font-caption text-secondary whitespace-nowrap">
                  {completion}% complete
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Basic Information */}
        <SectionCard
          title="Basic Information"
          icon="badge"
          isOpen={sectionsOpen.basic}
          onToggle={() => toggleSection('basic')}
          completed={!!form.dateOfBirth && !!form.gender && !!form.bloodGroup && !!form.genotype}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Date of Birth">
              <PremiumDateInput
                value={form.dateOfBirth}
                onChange={e => updateField('dateOfBirth', e.target.value)}
              />
            </Field>
            <Field label="Gender">
              <PremiumSelect value={form.gender} onChange={e => updateField('gender', e.target.value)}>
                <option value="">Select gender</option>
                {genderOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </PremiumSelect>
            </Field>
            <Field label="Blood Group">
              <PremiumSelect value={form.bloodGroup} onChange={e => updateField('bloodGroup', e.target.value)}>
                <option value="">Select blood group</option>
                {bloodGroupOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </PremiumSelect>
            </Field>
            <Field label="Genotype">
              <PremiumSelect value={form.genotype} onChange={e => updateField('genotype', e.target.value)}>
                <option value="">Select genotype</option>
                {genotypeOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </PremiumSelect>
            </Field>
          </div>
        </SectionCard>

        {/* Section: Contact Information */}
        <SectionCard
          title="Contact Information"
          icon="contact_phone"
          isOpen={sectionsOpen.contact}
          onToggle={() => toggleSection('contact')}
          completed={!!form.phoneNumber && !!form.email && !!form.homeAddress && !!form.city && !!form.state}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone Number">
              <input
                className={inputClass()}
                type="tel"
                placeholder="e.g. +234 800 000 0000"
                value={form.phoneNumber}
                onChange={e => updateField('phoneNumber', e.target.value)}
              />
            </Field>
            <Field label="Email Address">
              <input
                className={inputClass()}
                type="email"
                placeholder="your.email@example.com"
                value={form.email}
                onChange={e => updateField('email', e.target.value)}
              />
            </Field>
            <Field label="Home Address" className="sm:col-span-2">
              <textarea
                className={inputClass() + ' resize-none'}
                rows={2}
                placeholder="Street address, building, etc."
                value={form.homeAddress}
                onChange={e => updateField('homeAddress', e.target.value)}
              />
            </Field>
            <Field label="City">
              <input
                className={inputClass()}
                placeholder="e.g. Lagos"
                value={form.city}
                onChange={e => updateField('city', e.target.value)}
              />
            </Field>
            <Field label="State / Region">
              <PremiumSelect value={form.state} onChange={e => updateField('state', e.target.value)}>
                <option value="">Select state</option>
                {stateOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </PremiumSelect>
            </Field>
          </div>
        </SectionCard>

        {/* Section: Medical Information */}
        <SectionCard
          title="Medical Information"
          icon="monitor_heart"
          isOpen={sectionsOpen.medical}
          onToggle={() => toggleSection('medical')}
          completed={form.knownAllergies.length > 0 || form.chronicConditions.length > 0 || form.currentMedications.length > 0 || !!form.pastSurgeries || !!form.disabilities}
        >
          <div className="space-y-6">
            {/* Allergies */}
            <div>
              <p className="font-label-md text-label-md text-secondary mb-2">Known Allergies</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.knownAllergies.map(a => (
                  <span key={a} className={badgeClass()}>
                    <span className="w-2 h-2 rounded-full bg-error" />
                    {a}
                    <button onClick={() => removeAllergy(a)} className="text-secondary hover:text-error transition-colors ml-1">
                      <Icon icon="close" size="xs" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass() + ' flex-1'}
                  placeholder="Add an allergy..."
                  value={newAllergy}
                  onChange={e => setNewAllergy(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addAllergy() }}
                />
                <button onClick={addAllergy} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors">
                  <Icon icon="add" size="md" />
                </button>
              </div>
            </div>

            {/* Conditions */}
            <div>
              <p className="font-label-md text-label-md text-secondary mb-2">Chronic Conditions</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.chronicConditions.map(c => (
                  <span key={c} className={badgeClass()}>
                    <span className="w-2 h-2 rounded-full bg-tertiary" />
                    {c}
                    <button onClick={() => removeCondition(c)} className="text-secondary hover:text-error transition-colors ml-1">
                      <Icon icon="close" size="xs" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass() + ' flex-1'}
                  placeholder="Add a condition..."
                  value={newCondition}
                  onChange={e => setNewCondition(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCondition() }}
                />
                <button onClick={addCondition} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors">
                  <Icon icon="add" size="md" />
                </button>
              </div>
            </div>

            {/* Medications */}
            <div>
              <p className="font-label-md text-label-md text-secondary mb-2">Current Medications</p>
              {form.currentMedications.length > 0 && (
                <div className="space-y-2 mb-3">
                  {form.currentMedications.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 bg-surface border border-outline-variant rounded-lg px-4 py-3">
                      <div className="flex-1">
                        <p className="font-label-md text-on-surface">{m.name}</p>
                        <p className="text-caption text-secondary">{m.dosage} &middot; {m.frequency}</p>
                      </div>
                      <button onClick={() => removeMedication(i)} className="text-secondary hover:text-error transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <Icon icon="close" size="sm" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  className={inputClass() + ' sm:col-span-2'}
                  placeholder="Medication name"
                  value={newMedication.name}
                  onChange={e => setNewMedication(p => ({ ...p, name: e.target.value }))}
                />
                <input
                  className={inputClass()}
                  placeholder="Dosage"
                  value={newMedication.dosage}
                  onChange={e => setNewMedication(p => ({ ...p, dosage: e.target.value }))}
                />
                <div className="flex gap-2 sm:col-span-1">
                  <input
                    className={inputClass() + ' flex-1 min-w-0'}
                    placeholder="Frequency"
                    value={newMedication.frequency}
                    onChange={e => setNewMedication(p => ({ ...p, frequency: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addMedication() }}
                  />
                  <button onClick={addMedication} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors self-stretch shrink-0">
                    <Icon icon="add" size="md" />
                  </button>
                </div>
              </div>
            </div>

            {/* Past Surgeries */}
            <Field label="Past Surgeries / Procedures">
              <textarea
                className={inputClass() + ' resize-none'}
                rows={3}
                placeholder="List any past surgeries or significant procedures..."
                value={form.pastSurgeries}
                onChange={e => updateField('pastSurgeries', e.target.value)}
              />
            </Field>

            {/* Disabilities */}
            <Field label="Disabilities / Special Needs">
              <textarea
                className={inputClass() + ' resize-none'}
                rows={3}
                placeholder="Describe any disabilities or special needs..."
                value={form.disabilities}
                onChange={e => updateField('disabilities', e.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Section: Emergency Contact */}
        <SectionCard
          title="Emergency Contact"
          icon="contact_emergency"
          isOpen={sectionsOpen.emergency}
          onToggle={() => toggleSection('emergency')}
          completed={!!form.emergencyName && !!form.emergencyRelationship && !!form.emergencyPhone}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name">
              <input
                className={inputClass()}
                placeholder="Emergency contact name"
                value={form.emergencyName}
                onChange={e => updateField('emergencyName', e.target.value)}
              />
            </Field>
            <Field label="Relationship">
              <input
                className={inputClass()}
                placeholder="e.g. Spouse, Sibling"
                value={form.emergencyRelationship}
                onChange={e => updateField('emergencyRelationship', e.target.value)}
              />
            </Field>
            <Field label="Phone Number">
              <input
                className={inputClass()}
                type="tel"
                placeholder="e.g. +234 800 000 0000"
                value={form.emergencyPhone}
                onChange={e => updateField('emergencyPhone', e.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        {/* Section: App-Specific */}
        <SectionCard
          title="App Settings & History"
          icon="manage_accounts"
          isOpen={sectionsOpen.appSpecific}
          onToggle={() => toggleSection('appSpecific')}
          completed={!!form.preferredDoctor || !!form.preferredHospital}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Patient ID" readonly>
                <input className={inputClass() + ' opacity-60 cursor-not-allowed'} value={form.patientId || 'Auto-assigned'} readOnly />
              </Field>
              <Field label="Registered Date" readonly>
                <input className={inputClass() + ' opacity-60 cursor-not-allowed'} value={form.registeredDate || 'Not yet registered'} readOnly />
              </Field>
              <Field label="Preferred Doctor">
                <input
                  className={inputClass()}
                  placeholder="e.g. Dr. Smith"
                  value={form.preferredDoctor}
                  onChange={e => updateField('preferredDoctor', e.target.value)}
                />
              </Field>
              <Field label="Preferred Hospital / Clinic">
                <input
                  className={inputClass()}
                  placeholder="e.g. Lagos General Hospital"
                  value={form.preferredHospital}
                  onChange={e => updateField('preferredHospital', e.target.value)}
                />
              </Field>
            </div>

            {form.appointmentHistory.length > 0 && (
              <div>
                <p className="font-label-md text-label-md text-secondary mb-2">Appointment History</p>
                <div className="space-y-2">
                  {form.appointmentHistory.map((a, i) => (
                    <div key={i} className="bg-surface border border-outline-variant rounded-lg px-4 py-3 flex items-center gap-3">
                      <Icon icon="event" size="lg" className="text-primary" />
                      <div className="flex-1">
                        <p className="font-label-md text-on-surface">{a.reason}</p>
                        <p className="text-caption text-secondary">{a.date} &middot; {a.doctor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.medicalRecords.length > 0 && (
              <div>
                <p className="font-label-md text-label-md text-secondary mb-2">Medical Records</p>
                <div className="space-y-2">
                  {form.medicalRecords.map((r, i) => (
                    <div key={i} className="bg-surface border border-outline-variant rounded-lg px-4 py-3 flex items-center gap-3">
                      <Icon icon="description" size="lg" className="text-primary" />
                      <div className="flex-1">
                        <p className="font-label-md text-on-surface">{r.name}</p>
                        <p className="text-caption text-secondary">{r.type} &middot; {new Date(r.uploadedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Save + Delete */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-4">
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex-1 py-3 px-6 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            <Icon icon={saving ? 'hourglass_top' : dirty ? 'save' : 'check_circle'} size="md" />
            {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
          </button>
        </div>

        {/* Delete Account */}
        <div className="border border-error/30 rounded-xl overflow-hidden shadow-sm mt-4">
          <div className="bg-error/5 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error">
                <Icon icon="delete_forever" size="lg" />
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Delete Account</h3>
                <p className="text-caption text-secondary">Permanently remove all data and triage history</p>
              </div>
            </div>
            <div className="bg-error/10 border border-error/20 rounded-lg p-4 mb-5 flex items-start gap-3">
              <Icon icon="warning" size="lg" className="text-error shrink-0 mt-0.5" />
              <p className="text-caption text-on-surface-variant">
                This action <strong>cannot be undone</strong>. All your medical records, triage sessions, medication data, and personal information will be permanently deleted.
              </p>
            </div>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 px-6 rounded-full bg-error text-white font-label-md text-label-md hover:bg-red-700 transition-colors flex items-center justify-center gap-2 min-h-[44px]">
                <Icon icon="delete" size="lg" />
                Delete My Account
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface mb-2">
                    Type <strong className="text-error">DELETE</strong> to confirm
                  </label>
                  <input
                    className="w-full bg-surface border border-error/50 rounded-lg px-4 py-3 font-body-md text-on-surface focus:border-error focus:ring-2 focus:ring-error/20 transition-all outline-none placeholder:text-secondary"
                    placeholder="Type DELETE here..."
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                    className="flex-1 py-3 px-6 rounded-full border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface transition-colors min-h-[44px]"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={deleteConfirmText !== 'DELETE'}
                    onClick={() => { signOut(); navigate('/sign-in') }}
                    className="flex-1 py-3 px-6 rounded-full bg-error text-white font-label-md text-label-md hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    <Icon icon="delete_forever" size="lg" />
                    Permanently Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 mb-12 flex flex-col md:flex-row items-center justify-between py-6 border-t border-outline-variant gap-4">
          <div className="flex items-center gap-6">
          </div>
          <div className="flex gap-stack-lg">
            <a className="text-caption text-secondary hover:text-primary transition-colors" href="#">Privacy Policy</a>
            <a className="text-caption text-secondary hover:text-primary transition-colors" href="#">Terms of Service</a>
          </div>
        </footer>
      </div>

      {/* Password Confirm Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowPasswordModal(false); setPasswordConfirmValue(''); setPasswordConfirmError('') }}>
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 md:p-8 max-w-md w-full mx-4 shadow-2xl modal-animate" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Icon icon="lock" size="lg" />
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Confirm Password</h3>
                <p className="text-caption text-secondary">Enter your current password to save email changes.</p>
              </div>
            </div>
            <input
              type="password"
              className={inputClass(passwordConfirmError)}
              placeholder="Current password"
              value={passwordConfirmValue}
              onChange={e => { setPasswordConfirmValue(e.target.value); setPasswordConfirmError('') }}
              onKeyDown={e => { if (e.key === 'Enter') handlePasswordConfirm() }}
              autoFocus
            />
            {passwordConfirmError && (
              <p className="text-caption text-error mt-2">{passwordConfirmError}</p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordConfirmValue(''); setPasswordConfirmError('') }}
                className="flex-1 py-3 px-6 rounded-full border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordConfirm}
                disabled={!passwordConfirmValue}
                className="flex-1 py-3 px-6 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

/* Section card wrapper */
function SectionCard({
  title,
  icon,
  isOpen,
  onToggle,
  completed,
  children,
}: {
  title: string
  icon: string
  isOpen: boolean
  onToggle: () => void
  completed: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 hover:bg-primary/10 transition-colors text-left min-h-[44px]"
      >
        <Icon icon={icon} size="lg" className="text-primary" />
        <h3 className="font-headline-md text-headline-md text-on-surface flex-1">{title}</h3>
        {completed && (
          <span className="text-green-400">
            <Icon icon="check_circle" size="lg" />
          </span>
        )}
        <Icon icon={isOpen ? 'expand_less' : 'expand_more'} size="lg" className="text-secondary" />
      </button>
      {isOpen && (
        <div className="px-4 md:px-6 pb-4 md:pb-6">
          {children}
        </div>
      )}
    </div>
  )
}

/* Field label wrapper */
function Field({
  label,
  children,
  className,
  readonly,
}: {
  label: string
  children: React.ReactNode
  className?: string
  readonly?: boolean
}) {
  return (
    <div className={className}>
      <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">
        {label}
        {readonly && <span className="text-caption text-secondary ml-1">(read-only)</span>}
      </label>
      {children}
    </div>
  )
}
