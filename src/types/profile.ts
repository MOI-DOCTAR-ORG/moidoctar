export interface Medication {
  name: string
  dosage: string
  frequency: string
}

export function calculateAge(dobString?: string | null): number | undefined {
  if (!dobString || typeof dobString !== 'string' || !dobString.trim()) return undefined

  let d = new Date(dobString)

  if (isNaN(d.getTime())) {
    const parts = dobString.split(/[-/.]/)
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
      } else if (parts[2].length === 4) {
        // MM/DD/YYYY or DD/MM/YYYY
        const p0 = parseInt(parts[0], 10)
        const p1 = parseInt(parts[1], 10)
        const year = parseInt(parts[2], 10)
        if (p0 > 12) {
          // DD/MM/YYYY
          d = new Date(year, p1 - 1, p0)
        } else {
          // MM/DD/YYYY
          d = new Date(year, p0 - 1, p1)
        }
      }
    }
  }

  if (isNaN(d.getTime())) return undefined

  const today = new Date()
  let age = today.getFullYear() - d.getFullYear()
  const monthDiff = today.getMonth() - d.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < d.getDate())) {
    age--
  }
  return age >= 0 && age < 125 ? age : undefined
}

export interface AppointmentRecord {
  date: string
  doctor: string
  reason: string
}

export interface MedicalRecordFile {
  name: string
  type: string
  dataUrl: string
  uploadedAt: string
}

export interface PatientProfile {
  photo: string | null
  fullName: string
  dateOfBirth: string
  gender: string
  bloodGroup: string
  genotype: string
  phoneNumber: string
  email: string
  homeAddress: string
  state: string
  city: string
  knownAllergies: string[]
  chronicConditions: string[]
  currentMedications: Medication[]
  pastSurgeries: string
  disabilities: string
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
  patientId: string
  registeredDate: string
  appointmentHistory: AppointmentRecord[]
  medicalRecords: MedicalRecordFile[]
  preferredDoctor: string
  preferredHospital: string
}

export function createDefaultProfile(): PatientProfile {
  return {
    photo: null,
    fullName: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    genotype: '',
    phoneNumber: '',
    email: '',
    homeAddress: '',
    state: '',
    city: '',
    knownAllergies: [],
    chronicConditions: [],
    currentMedications: [],
    pastSurgeries: '',
    disabilities: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    patientId: '',
    registeredDate: '',
    appointmentHistory: [],
    medicalRecords: [],
    preferredDoctor: '',
    preferredHospital: '',
  }
}

/**
 * Share of the profile the person has filled in, as a whole percentage (0–100).
 * The sign-in email isn't counted: it comes with the account and can't be edited here.
 * Any chosen answer counts as filled — including "Don't know" and "Prefer not to say".
 */
export function calculateCompletion(profile: PatientProfile): number {
  const filled = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : !!v
  const listed = (v: unknown) => Array.isArray(v) && v.length > 0
  const fields: boolean[] = [
    filled(profile.photo),
    filled(profile.fullName),
    filled(profile.dateOfBirth),
    filled(profile.gender),
    filled(profile.bloodGroup),
    filled(profile.genotype),
    filled(profile.phoneNumber),
    filled(profile.homeAddress),
    filled(profile.state),
    filled(profile.city),
    listed(profile.knownAllergies),
    listed(profile.chronicConditions),
    listed(profile.currentMedications),
    filled(profile.pastSurgeries),
    filled(profile.disabilities),
    filled(profile.emergencyName),
    filled(profile.emergencyRelationship),
    filled(profile.emergencyPhone),
    filled(profile.preferredDoctor),
    filled(profile.preferredHospital),
  ]
  return Math.round((fields.filter(Boolean).length / fields.length) * 100)
}

export function loadProfile(key: string): PatientProfile | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveProfile(key: string, profile: PatientProfile) {
  try {
    localStorage.setItem(key, JSON.stringify(profile))
  } catch {}
}
