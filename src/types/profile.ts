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

export function calculateCompletion(profile: PatientProfile): number {
  const fields: boolean[] = [
    !!profile.photo,
    !!profile.fullName,
    !!profile.dateOfBirth,
    !!profile.gender,
    !!profile.bloodGroup,
    !!profile.genotype,
    !!profile.phoneNumber,
    !!profile.email,
    !!profile.homeAddress,
    !!profile.state,
    !!profile.city,
    profile.knownAllergies.length > 0,
    profile.chronicConditions.length > 0,
    profile.currentMedications.length > 0,
    !!profile.pastSurgeries,
    !!profile.disabilities,
    !!profile.emergencyName,
    !!profile.emergencyRelationship,
    !!profile.emergencyPhone,
    !!profile.preferredDoctor,
    !!profile.preferredHospital,
  ]
  const filled = fields.filter(Boolean).length
  return Math.round((filled / fields.length) * 100)
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
