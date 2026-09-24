import { loadProfile } from '../types/profile'
import { scopeKey } from '../utils/storage'

export type BodyAreaLike = { label: string; severity: string; notes?: string }

function ageFromDob(dob: string): number | undefined {
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return undefined
  const years = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
  return years > 0 && years < 125 ? years : undefined
}

/**
 * Everything the app already knows about the person, sent along with each
 * triage message so the assistant does not have to ask again. The server also
 * stores it (with a change log) so it can be reviewed in AI settings.
 */
export function buildAiContext(opts: { bodyAreas?: BodyAreaLike[]; severity?: string | null } = {}) {
  const profile = loadProfile(scopeKey('doctarr_patient_profile'))
  const ctx: Record<string, unknown> = {}
  if (profile) {
    ctx.profile = {
      age: profile.dateOfBirth ? ageFromDob(profile.dateOfBirth) : undefined,
      gender: profile.gender || undefined,
      location: [profile.city, profile.state].filter(Boolean).join(', ') || undefined,
      allergies: profile.knownAllergies,
      conditions: profile.chronicConditions,
      medications: profile.currentMedications.map((m) => [m.name, m.dosage, m.frequency].filter(Boolean).join(' ')),
    }
  }
  if (opts.bodyAreas?.length) ctx.body_areas = opts.bodyAreas
  if (opts.severity) ctx.severity = opts.severity
  return JSON.stringify(ctx)
}
