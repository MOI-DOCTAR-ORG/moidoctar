import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, type BackendUser } from '../context/AuthContext'
import { useToastContext } from '../context/ToastContext'
import Icon from '../components/Icon'
import { PremiumDateInput, PremiumSelect, premiumControlClass } from '../components/ui/PremiumFormControls'
import { scopeKey } from '../utils/storage'
import { api } from '../services/api'
import modelClient from '../lib/modelAxios'
import { uploadImageToCloudinary } from '../services/cloudinary'
import { getPermissionState, requestLocationPermission, requestNotificationPermission, type PermissionResult } from '../utils/permissions'
import { resetTourCompleted, REPLAY_TOUR_EVENT } from '../components/OnboardingTour'
import { getAccountEmail, getDisplayName, getInitials, getProfileImage, isPlaceholderName } from '../lib/userIdentity'
import {
  type PatientProfile,
  type Medication,
  createDefaultProfile,
  calculateCompletion,
  calculateAge,
  loadProfile,
  saveProfile as persistProfile,
} from '../types/profile'

const STORAGE_KEY = 'doctarr_patient_profile'

/** Typing waits this long before saving; choices from a list save right away. */
const TEXT_SAVE_DELAY_MS = 800
const IMMEDIATE_SAVE_DELAY_MS = 0

const UNKNOWN_OPTIONS = ["Don't know", 'Prefer not to say']
const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
const bloodGroupOptions = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ...UNKNOWN_OPTIONS]
const genotypeOptions = ['AA', 'AS', 'SS', 'AC', 'SC', 'CC', ...UNKNOWN_OPTIONS]
const stateOptions = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

/** The option whose text matches `value` ignoring case (the backend lower-cases gender), or ''. */
function matchOption(options: string[], value?: string | null): string {
  const v = (value ?? '').trim().toLowerCase()
  return options.find(o => o.toLowerCase() === v) ?? ''
}

/**
 * The form as it should look when the page opens: this device's saved profile, with
 * account-owned fields (email, picture, and the name once the account has a real one)
 * always taken from the signed-in account, and blanks filled from it too — e.g. on a
 * new device.
 */
function hydrateProfile(stored: PatientProfile | null, user: BackendUser): PatientProfile {
  const form: PatientProfile = { ...createDefaultProfile(), ...(stored ?? {}) }
  const accountName = getDisplayName(user)
  form.fullName = accountName || (isPlaceholderName(form.fullName, user.email) ? '' : form.fullName.trim())
  form.email = getAccountEmail(user)
  form.photo = getProfileImage(user)
  form.patientId = form.patientId || user._id
  if (!form.registeredDate && user.createdAt) {
    form.registeredDate = new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }
  if (!form.phoneNumber && user.phone) form.phoneNumber = user.phone
  if (!form.gender) form.gender = matchOption(genderOptions, user.demographics?.gender)
  if (!form.bloodGroup) form.bloodGroup = matchOption(bloodGroupOptions, user.demographics?.bloodType)
  if (!form.genotype) form.genotype = matchOption(genotypeOptions, user.demographics?.genotype)
  if (!form.dateOfBirth && user.demographics?.dateOfBirth) form.dateOfBirth = user.demographics.dateOfBirth
  return form
}

/** What the account stores. Email is deliberately absent: the Profile never changes it. */
function accountPayload(form: PatientProfile) {
  const age = calculateAge(form.dateOfBirth)
  // An empty string (not undefined) clears a removed photo instead of leaving the old one.
  const photo = form.photo ?? ''
  return {
    userName: form.fullName.trim() || undefined,
    phone: form.phoneNumber || undefined,
    photo,
    demographics: {
      gender: form.gender?.toLowerCase() || undefined,
      // The account schema stores age as text.
      age: age !== undefined ? String(age) : undefined,
      bloodType: form.bloodGroup || undefined,
      genotype: form.genotype || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      country: form.state || undefined,
      photoUrl: photo,
    },
  }
}

function healthContextPayload(form: PatientProfile) {
  return {
    age: calculateAge(form.dateOfBirth),
    gender: form.gender || undefined,
    location: [form.city, form.state].filter(Boolean).join(', ') || undefined,
    allergies: form.knownAllergies,
    conditions: form.chronicConditions,
    medications: form.currentMedications.map(m => `${m.name} (${m.dosage})`),
  }
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut, updateUser } = useAuth()
  const { addToast } = useToastContext()

  const getScopedKey = useCallback(() => scopeKey(STORAGE_KEY), [])

  const [form, setForm] = useState<PatientProfile>(createDefaultProfile)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // The latest form, readable from timers and async saves without stale closures.
  const formRef = useRef<PatientProfile>(form)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Saves run one at a time, in order; edits made meanwhile are sent right after.
  const saveInFlightRef = useRef(false)
  const saveQueuedRef = useRef(false)
  // What the server last accepted, so unchanged data isn't sent again.
  const lastSavedAccountRef = useRef<string | null>(null)
  const lastSavedHealthRef = useRef<string | null>(null)
  const hydratedForRef = useRef<string | null>(null)

  const [sectionsOpen, setSectionsOpen] = useState({
    basic: true,
    contact: true,
    medical: true,
    emergency: true,
    appSpecific: true,
    permissions: true,
  })

  const [locationPerm, setLocationPerm] = useState<PermissionResult | 'prompt' | 'unknown' | 'requesting'>('unknown')
  const [notificationPerm, setNotificationPerm] = useState<PermissionResult | 'prompt' | 'unknown' | 'requesting'>('unknown')

  useEffect(() => {
    let cancelled = false
    getPermissionState('geolocation').then(s => { if (!cancelled) setLocationPerm(s) })
    getPermissionState('notifications').then(s => { if (!cancelled) setNotificationPerm(s) })
    return () => { cancelled = true }
  }, [])

  const handleEnablePermissions = async () => {
    setLocationPerm('requesting')
    setNotificationPerm('requesting')
    const [loc, notif] = await Promise.all([requestLocationPermission(), requestNotificationPermission()])
    setLocationPerm(loc)
    setNotificationPerm(notif)
    if (loc === 'granted' || loc === 'approximate' || notif === 'granted') {
      addToast('Permissions updated', 'success')
    } else {
      addToast('Permission requests were blocked — enable them in your browser’s site settings.', 'error')
    }
  }

  const handleReplayTour = () => {
    resetTourCompleted()
    navigate('/dashboard')
    window.dispatchEvent(new Event(REPLAY_TOUR_EVENT))
  }

  const [newAllergy, setNewAllergy] = useState('')
  const [newCondition, setNewCondition] = useState('')
  const [newMedication, setNewMedication] = useState<Medication>({ name: '', dosage: '', frequency: '' })

  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Hydrate once per signed-in account. Never saves: nothing has been edited yet.
  useEffect(() => {
    if (!user || hydratedForRef.current === user._id) return
    hydratedForRef.current = user._id
    const hydrated = hydrateProfile(loadProfile(getScopedKey()), user)
    formRef.current = hydrated
    setForm(hydrated)
    persistProfile(getScopedKey(), hydrated)
    // What the account already holds counts as saved.
    lastSavedAccountRef.current = JSON.stringify(accountPayload(hydrated))
  }, [getScopedKey, user])

  /** Send the latest form to the account (and Liana's memory) if it changed. */
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    if (saveInFlightRef.current) {
      saveQueuedRef.current = true
      return
    }
    saveInFlightRef.current = true
    let failed = false
    try {
      do {
        saveQueuedRef.current = false
        const snapshot = formRef.current
        const account = accountPayload(snapshot)
        const accountKey = JSON.stringify(account)
        const health = healthContextPayload(snapshot)
        const healthKey = JSON.stringify(health)

        if (accountKey !== lastSavedAccountRef.current) {
          setSaveStatus('saving')
          try {
            const res = await api.put<{ data: BackendUser }>('/user/updateProfile', account)
            lastSavedAccountRef.current = accountKey
            failed = false
            if (res?.data) updateUser(res.data)
          } catch {
            failed = true
          }
        }

        if (healthKey !== lastSavedHealthRef.current) {
          // Liana's memory is a best-effort mirror; the profile itself is already saved above.
          try {
            await modelClient.put('/ai/health-context', health)
            lastSavedHealthRef.current = healthKey
          } catch { /* retried with the next change */ }
        }
      } while (saveQueuedRef.current)
    } finally {
      saveInFlightRef.current = false
    }
    // A newer edit may have been scheduled while the last request was in flight.
    if (saveTimerRef.current) return
    setSaveStatus(failed ? 'error' : 'saved')
  }, [updateUser])

  const scheduleSave = useCallback((delay: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveStatus('pending')
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null
      void flushSave()
    }, delay)
  }, [flushSave])

  // Leaving the page before the debounce fires still saves the last edit.
  useEffect(() => () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
      void flushSave()
    }
  }, [flushSave])

  const unsaved = saveStatus === 'pending' || saveStatus === 'saving' || saveStatus === 'error'
  useEffect(() => {
    if (!unsaved) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [unsaved])

  const updateField = useCallback(<K extends keyof PatientProfile>(field: K, value: PatientProfile[K], delay = TEXT_SAVE_DELAY_MS) => {
    const next = { ...formRef.current, [field]: value }
    formRef.current = next
    setForm(next)
    // Kept on this device straight away, so nothing typed is lost if the network is down.
    persistProfile(getScopedKey(), next)
    scheduleSave(delay)
  }, [getScopedKey, scheduleSave])

  const toggleSection = useCallback((section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const completion = calculateCompletion(form)

  const addAllergy = () => {
    const v = newAllergy.trim()
    if (v && !form.knownAllergies.includes(v)) {
      updateField('knownAllergies', [...form.knownAllergies, v], IMMEDIATE_SAVE_DELAY_MS)
      setNewAllergy('')
    }
  }

  const removeAllergy = (a: string) => {
    updateField('knownAllergies', form.knownAllergies.filter(x => x !== a), IMMEDIATE_SAVE_DELAY_MS)
  }

  const addCondition = () => {
    const v = newCondition.trim()
    if (v && !form.chronicConditions.includes(v)) {
      updateField('chronicConditions', [...form.chronicConditions, v], IMMEDIATE_SAVE_DELAY_MS)
      setNewCondition('')
    }
  }

  const removeCondition = (c: string) => {
    updateField('chronicConditions', form.chronicConditions.filter(x => x !== c), IMMEDIATE_SAVE_DELAY_MS)
  }

  const addMedication = () => {
    if (!newMedication.name.trim() || !newMedication.dosage.trim() || !newMedication.frequency.trim()) return
    updateField('currentMedications', [...form.currentMedications, { ...newMedication }], IMMEDIATE_SAVE_DELAY_MS)
    setNewMedication({ name: '', dosage: '', frequency: '' })
  }

  const removeMedication = (i: number) => {
    updateField('currentMedications', form.currentMedications.filter((_, idx) => idx !== i), IMMEDIATE_SAVE_DELAY_MS)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    // Let the same file be picked again later.
    input.value = ''
    if (!file || isUploadingPhoto) return

    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
      addToast('Please upload a PNG, JPEG, or WebP image.', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be under 5MB.', 'error')
      return
    }

    setIsUploadingPhoto(true)
    try {
      const url = await uploadImageToCloudinary(file)
      // Saved to the account right away — no separate Save step.
      updateField('photo', url, IMMEDIATE_SAVE_DELAY_MS)
    } catch {
      addToast('Your photo couldn’t be uploaded. Your previous picture is unchanged — please try again.', 'error')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const removePhoto = () => {
    updateField('photo', null, IMMEDIATE_SAVE_DELAY_MS)
  }

  function inputClass(error?: string) {
    return premiumControlClass({ tone: error ? 'danger' : 'default' })
  }

  function badgeClass() {
    return 'bg-surface border border-outline-variant px-3 py-1 rounded-full text-label-md font-label-md text-on-surface flex items-center gap-2'
  }

  const nameMissing = !form.fullName.trim()

  return (
    <main className="min-h-[100dvh] flex flex-col items-center">
      <div className="max-w-[900px] w-full px-4 md:px-gutter pt-3 pb-4 md:py-stack-lg flex flex-col gap-4 md:gap-gutter">
        {/* Save state: pinned under the app header so it's visible wherever you are on the page. */}
        <div className="sticky top-[4.25rem] md:top-[4.75rem] z-20 -mb-2 md:-mb-4 flex justify-end pointer-events-none min-h-[28px]" aria-live="polite">
          <SaveIndicator status={saveStatus} onRetry={() => void flushSave()} />
        </div>

        {/* Profile Header Card */}
        <div className="bg-surface border border-outline-variant rounded-xl p-4 md:p-6">
          {/* Phones: photo beside email + completion, name full-width below.
              Wider screens: photo on the left, name above email + completion. */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 md:gap-x-6 md:gap-y-2">
            {/* Photo */}
            <div className="relative shrink-0 group md:row-span-2">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl md:text-3xl font-extrabold border-2 md:border-4 border-outline-variant overflow-hidden relative">
                {isUploadingPhoto ? (
                  <div className="flex flex-col items-center gap-1 text-primary" role="status">
                    <Icon icon="hourglass_top" size="lg" className="animate-spin" />
                    <span className="sr-only">Uploading photo…</span>
                  </div>
                ) : form.photo ? (
                  <img src={form.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span aria-hidden="true">{getInitials(form.fullName)}</span>
                )}
              </div>
              <label
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 cursor-pointer flex items-center justify-center transition-opacity"
                title={form.photo ? 'Change photo' : 'Add photo'}
              >
                <Icon icon="camera_alt" size="xl" className="text-white" />
                <span className="sr-only">{form.photo ? 'Change profile photo' : 'Add profile photo'}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={isUploadingPhoto}
                  onChange={handlePhotoUpload}
                />
              </label>
              {/* Always-visible camera badge: touch screens have no hover. */}
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center border-2 border-surface shadow-sm">
                <Icon icon="camera_alt" size="sm" />
              </span>
              {form.photo && !isUploadingPhoto && (
                <button
                  type="button"
                  onClick={removePhoto}
                  aria-label="Remove profile photo"
                  className="absolute -top-1 -right-1 w-7 h-7 bg-error text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
                >
                  <Icon icon="close" size="sm" />
                </button>
              )}
            </div>

            {/* Name */}
            <div className="col-span-2 order-last md:order-none md:col-span-1 md:col-start-2 md:row-start-1 min-w-0">
              <label htmlFor="profile-full-name" className="block text-caption font-caption text-secondary mb-1">
                Full name
              </label>
              <div className="relative">
                <input
                  id="profile-full-name"
                  className={premiumControlClass({
                    compact: true,
                    tone: nameMissing ? 'danger' : 'default',
                    className: 'pr-10 font-bold text-base md:text-lg',
                  })}
                  value={form.fullName}
                  autoComplete="name"
                  aria-invalid={nameMissing || undefined}
                  aria-describedby={nameMissing ? 'profile-full-name-hint' : undefined}
                  onChange={e => updateField('fullName', e.target.value)}
                />
                <Icon icon="edit" size="sm" aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-primary" />
              </div>
              {nameMissing && (
                <p id="profile-full-name-hint" className="mt-1 text-caption text-error">Add your name so Liana knows what to call you.</p>
              )}
            </div>

            {/* Email / Completion */}
            <div className="min-w-0 md:col-start-2 md:row-start-2">
              <p className="flex items-center gap-1.5 text-caption font-caption text-secondary min-w-0" title="Your sign-in email can't be changed here">
                <Icon icon="lock" size="xs" className="text-outline shrink-0" aria-hidden="true" />
                <span className="truncate">{form.email || 'No email on this account'}</span>
                <span className="sr-only">(sign-in email, read-only)</span>
              </p>

              {/* Completion bar */}
              <div className="mt-2.5 flex items-center gap-3">
                <div
                  className="flex-1 h-2 bg-outline-variant rounded-full overflow-hidden"
                  role="progressbar"
                  aria-label="Profile completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={completion}
                >
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Field label="Date of Birth">
              <PremiumDateInput
                value={form.dateOfBirth}
                onChange={e => updateField('dateOfBirth', e.target.value, IMMEDIATE_SAVE_DELAY_MS)}
              />
            </Field>
            <Field label="Gender">
              <PremiumSelect value={form.gender} onChange={e => updateField('gender', e.target.value, IMMEDIATE_SAVE_DELAY_MS)}>
                <option value="">Select gender</option>
                {genderOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </PremiumSelect>
            </Field>
            <Field label="Blood Group">
              <PremiumSelect value={form.bloodGroup} onChange={e => updateField('bloodGroup', e.target.value, IMMEDIATE_SAVE_DELAY_MS)}>
                <option value="">Select blood group</option>
                {bloodGroupOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </PremiumSelect>
            </Field>
            <Field label="Genotype">
              <PremiumSelect value={form.genotype} onChange={e => updateField('genotype', e.target.value, IMMEDIATE_SAVE_DELAY_MS)}>
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
          completed={!!form.phoneNumber && !!form.homeAddress && !!form.city && !!form.state}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Field label="Phone Number">
              <input
                className={inputClass()}
                type="tel"
                placeholder="e.g. +234 800 000 0000"
                value={form.phoneNumber}
                onChange={e => updateField('phoneNumber', e.target.value)}
              />
            </Field>
            <div>
              <p id="profile-email-label" className="block font-label-md text-label-md text-on-surface-variant mb-1.5">
                Email Address <span className="text-caption text-secondary ml-1">(read-only)</span>
              </p>
              <div
                aria-labelledby="profile-email-label"
                aria-describedby="profile-email-note"
                className="flex min-h-12 items-center gap-2 rounded-2xl border border-outline-variant/70 bg-surface-container px-4 py-3 font-body-md text-on-surface-variant"
              >
                <Icon icon="lock" size="sm" className="shrink-0 text-secondary" aria-hidden="true" />
                <span className="min-w-0 break-all">{form.email || 'No email on this account'}</span>
              </div>
              <p id="profile-email-note" className="text-[11px] text-secondary mt-1">
                This is the email you sign in with, so it can’t be changed here.
              </p>
            </div>
            <Field label="Home Address" className="sm:col-span-2">
              <textarea
                className={inputClass() + ' resize-none'}
                rows={2}
                value={form.homeAddress}
                onChange={e => updateField('homeAddress', e.target.value)}
              />
            </Field>
            <Field label="City">
              <input
                className={inputClass()}
                value={form.city}
                onChange={e => updateField('city', e.target.value)}
              />
            </Field>
            <Field label="State / Region">
              <PremiumSelect value={form.state} onChange={e => updateField('state', e.target.value, IMMEDIATE_SAVE_DELAY_MS)}>
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
          <div className="space-y-5 md:space-y-6">
            {/* Allergies */}
            <div>
              <p className="font-label-md text-label-md text-secondary mb-2">Known Allergies</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.knownAllergies.map(a => (
                  <span key={a} className={badgeClass()}>
                    <span className="w-2 h-2 rounded-full bg-error" />
                    {a}
                    <button type="button" onClick={() => removeAllergy(a)} aria-label={`Remove ${a}`} className="text-secondary hover:text-error transition-colors ml-1">
                      <Icon icon="close" size="xs" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass() + ' flex-1'}
                  placeholder="Add an allergy..."
                  aria-label="Add an allergy"
                  value={newAllergy}
                  onChange={e => setNewAllergy(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addAllergy() }}
                />
                <button type="button" onClick={addAllergy} aria-label="Add allergy" className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors">
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
                    <button type="button" onClick={() => removeCondition(c)} aria-label={`Remove ${c}`} className="text-secondary hover:text-error transition-colors ml-1">
                      <Icon icon="close" size="xs" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className={inputClass() + ' flex-1'}
                  placeholder="Add a condition..."
                  aria-label="Add a chronic condition"
                  value={newCondition}
                  onChange={e => setNewCondition(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addCondition() }}
                />
                <button type="button" onClick={addCondition} aria-label="Add condition" className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors">
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
                      <button type="button" onClick={() => removeMedication(i)} aria-label={`Remove ${m.name}`} className="text-secondary hover:text-error transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
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
                  aria-label="Medication name"
                  value={newMedication.name}
                  onChange={e => setNewMedication(p => ({ ...p, name: e.target.value }))}
                />
                <input
                  className={inputClass()}
                  placeholder="Dosage"
                  aria-label="Dosage"
                  value={newMedication.dosage}
                  onChange={e => setNewMedication(p => ({ ...p, dosage: e.target.value }))}
                />
                <div className="flex gap-2 sm:col-span-1">
                  <input
                    className={inputClass() + ' flex-1 min-w-0'}
                    placeholder="Frequency"
                    aria-label="Frequency"
                    value={newMedication.frequency}
                    onChange={e => setNewMedication(p => ({ ...p, frequency: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addMedication() }}
                  />
                  <button type="button" onClick={addMedication} aria-label="Add medication" className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-md hover:bg-primary/90 transition-colors self-stretch shrink-0">
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
                value={form.pastSurgeries}
                onChange={e => updateField('pastSurgeries', e.target.value)}
              />
            </Field>

            {/* Disabilities */}
            <Field label="Disabilities / Special Needs">
              <textarea
                className={inputClass() + ' resize-none'}
                rows={3}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <Field label="Full Name">
              <input
                className={inputClass()}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <Field label="Patient ID" readonly>
                <input className={inputClass() + ' opacity-60 cursor-not-allowed'} value={form.patientId || 'Auto-assigned'} readOnly />
              </Field>
              <Field label="Registered Date" readonly>
                <input className={inputClass() + ' opacity-60 cursor-not-allowed'} value={form.registeredDate || 'Not yet registered'} readOnly />
              </Field>
              <Field label="Preferred Doctor">
                <input
                  className={inputClass()}
                  value={form.preferredDoctor}
                  onChange={e => updateField('preferredDoctor', e.target.value)}
                />
              </Field>
              <Field label="Preferred Hospital / Clinic">
                <input
                  className={inputClass()}
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

        {/* Section: App Permissions & Tour */}
        <SectionCard
          title="App Permissions & Tour"
          icon="verified_user"
          isOpen={sectionsOpen.permissions}
          onToggle={() => toggleSection('permissions')}
          completed={locationPerm === 'granted' && notificationPerm === 'granted'}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <PermissionRow icon="location_on" label="Location" status={locationPerm} note="Used by Nearby Care to find facilities close to you." />
              <PermissionRow icon="notifications" label="Notifications" status={notificationPerm} note="Used for medication and triage reminders." />
            </div>
            <button
              type="button"
              onClick={handleEnablePermissions}
              disabled={locationPerm === 'requesting'}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
            >
              <Icon icon="location_on" size="md" />
              Enable location & notifications
            </button>
            <div className="pt-2 border-t border-outline-variant">
              <p className="text-caption text-secondary mb-2">Want a refresher on how MoiDoctar works?</p>
              <button
                type="button"
                onClick={handleReplayTour}
                className="px-5 py-2.5 rounded-full border border-outline-variant text-on-surface hover:bg-primary/5 transition-colors font-label-md text-label-md flex items-center gap-2 min-h-[40px]"
              >
                <Icon icon="restart_alt" size="md" />
                Replay welcome tour
              </button>
            </div>
          </div>
        </SectionCard>

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
            <Link className="text-caption text-secondary hover:text-primary transition-colors" to="/privacy">Privacy Policy</Link>
            <Link className="text-caption text-secondary hover:text-primary transition-colors" to="/terms">Terms of Service</Link>
          </div>
        </footer>
      </div>

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
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 hover:bg-primary/10 transition-colors text-left min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
      >
        <Icon icon={icon} size="lg" className="text-primary" />
        <h3 className="font-headline-md text-lg md:text-headline-md text-on-surface flex-1">{title}</h3>
        {completed && (
          <span className="text-success">
            <Icon icon="check_circle" size="lg" />
            <span className="sr-only">Complete</span>
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

/* One row in the App Permissions section: icon, label, and a status badge. */
function PermissionRow({
  icon,
  label,
  status,
  note,
}: {
  icon: string
  label: string
  status: 'granted' | 'approximate' | 'denied' | 'unsupported' | 'prompt' | 'unknown' | 'requesting'
  note: string
}) {
  const badge = (() => {
    switch (status) {
      case 'granted':
        return { text: 'Enabled (GPS)', className: 'bg-green-500/15 text-green-600 dark:text-green-400' }
      case 'approximate':
        return { text: 'Enabled (Approximate)', className: 'bg-green-500/15 text-green-600 dark:text-green-400' }
      case 'denied':
        return { text: 'Blocked', className: 'bg-error/15 text-error' }
      case 'unsupported':
        return { text: 'Unavailable', className: 'bg-outline-variant/50 text-secondary' }
      case 'requesting':
        return { text: 'Requesting…', className: 'bg-primary/15 text-primary' }
      default:
        return { text: 'Not set', className: 'bg-outline-variant/50 text-secondary' }
    }
  })()

  return (
    <div className="flex items-start gap-3 bg-background rounded-xl border border-outline-variant px-4 py-3">
      <Icon icon={icon} size="lg" className="text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-label-md text-label-md text-on-surface font-bold">{label}</p>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge.className}`}>{badge.text}</span>
        </div>
        <p className="text-caption text-secondary mt-0.5">{note}</p>
      </div>
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
    <label className={`block ${className ?? ''}`}>
      <span className="block font-label-md text-label-md text-on-surface-variant mb-1.5">
        {label}
        {readonly && <span className="text-caption text-secondary ml-1">(read-only)</span>}
      </span>
      {children}
    </label>
  )
}

/* Small "Saving… / Saved / Couldn't save" pill for the auto-save. */
function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'idle') return null
  const base = 'pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-bold border shadow-sm backdrop-blur'
  if (status === 'error') {
    return (
      <div role="alert" className={`${base} bg-error-container/90 text-on-error-container border-error/30`}>
        <Icon icon="error" size="sm" aria-hidden="true" />
        <span>Couldn’t save — kept on this device</span>
        <button
          type="button"
          onClick={onRetry}
          className="ml-1 rounded-full px-2 py-0.5 underline underline-offset-2 hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
        >
          Retry
        </button>
      </div>
    )
  }
  if (status === 'saved') {
    return (
      <div className={`${base} bg-surface/90 text-green-700 dark:text-green-400 border-green-500/30`}>
        <Icon icon="check_circle" size="sm" aria-hidden="true" />
        Saved
      </div>
    )
  }
  return (
    <div className={`${base} bg-surface/90 text-primary border-primary/30`}>
      <Icon icon="hourglass_top" size="sm" className="animate-spin" aria-hidden="true" />
      Saving…
    </div>
  )
}
