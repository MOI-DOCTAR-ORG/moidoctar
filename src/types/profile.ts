export interface Medication {
  name: string
  dosage: string
  frequency: string
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
