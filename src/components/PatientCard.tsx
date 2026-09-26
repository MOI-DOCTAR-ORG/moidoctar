import { useState } from 'react'
import Icon from './Icon'
import { useAiMemory } from '../hooks/useMoiDoctor'
import { loadProfile } from '../types/profile'
import { scopeKey } from '../utils/storage'
import type { AgeBand, PatientInfo } from '../types/triage'

/**
 * "Who is this check for?" — the age profile the addendum requires before assessment
 * (sections 2–4). The profile it resolves to (Adult, Pediatric 6+, Under 6) is shown so
 * the person can see which pathway is used. Weight is recorded for the future dosage
 * module; triage itself does not use it. Leaving the age blank is fine: Liana asks.
 */

export const BAND_LABEL: Record<AgeBand, string> = {
  adult: 'Adult',
  pediatric_6_plus: 'Pediatric 6+',
  under_6: 'Under 6',
}

function ownAge(): number | null {
  const p = loadProfile(scopeKey('doctarr_patient_profile'))
  if (!p?.dateOfBirth) return null
  const d = new Date(p.dateOfBirth)
  if (Number.isNaN(d.getTime())) return null
  const y = Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000))
  return y >= 0 && y < 125 ? y : null
}

/** Same cut-offs as the server (pathways.band_for_age). */
export function bandOf(p: PatientInfo): AgeBand | null {
  const years = p.age_years ?? (p.for === 'self' ? ownAge() : null)
  if (years == null && p.age_months == null) return null
  const total = (years ?? 0) + (p.age_months ?? 0) / 12
  if (total < 6) return 'under_6'
  if (total < 18) return 'pediatric_6_plus'
  return 'adult'
}

const WHO: { value: PatientInfo['for']; label: string; icon: string }[] = [
  { value: 'self', label: 'Me', icon: 'person' },
  { value: 'child', label: 'My child', icon: 'child_care' },
  { value: 'other', label: 'Someone else', icon: 'group' },
]

const LB_TO_KG = 0.45359237

const num = (v: string): number | null => {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export default function PatientCard({ value, onChange }: { value: PatientInfo; onChange: (p: PatientInfo) => void }) {
  const band = bandOf(value)
  const own = value.for === 'self' ? ownAge() : null
  const showMonths = value.for !== 'self' && (value.age_years == null || value.age_years < 2)
  const showPregnancy = value.for !== 'child' && band !== 'under_6' && band !== 'pediatric_6_plus'
  const set = (patch: Partial<PatientInfo>) => onChange({ ...value, ...patch })
  // Weight is stored in kg (the server and the dosage tables use kg); shown in the user's units.
  const imperial = useAiMemory().data?.preferences.units === 'imperial'
  const [weightDraft, setWeightDraft] = useState<string | null>(null)
  const weightShown = value.weight_kg == null ? '' : imperial
    ? String(Math.round(value.weight_kg / LB_TO_KG * 10) / 10) : String(value.weight_kg)

  const field = 'w-full rounded-lg border border-outline-variant bg-background px-3 py-2 text-sm text-on-surface outline-none focus:border-primary'

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-on-surface">Who is this check for?</p>
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${band ? 'bg-primary/15 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
          {band ? BAND_LABEL[band] : 'Age needed'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {WHO.map((w) => (
          <button
            key={w.value}
            type="button"
            onClick={() => onChange({ for: w.value, weight_kg: value.weight_kg })}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors ${
              value.for === w.value ? 'border-primary bg-primary text-on-primary' : 'border-outline-variant text-on-surface hover:bg-surface-container'
            }`}
          >
            <Icon icon={w.icon} size="xs" />
            {w.label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-[11px] text-on-surface-variant">
          Age (years)
          <input
            inputMode="numeric"
            className={field}
            placeholder={own != null ? String(own) : 'e.g. 34'}
            value={value.age_years ?? ''}
            onChange={(e) => set({ age_years: num(e.target.value) })}
          />
        </label>
        {showMonths && (
          <label className="text-[11px] text-on-surface-variant">
            and months
            <input inputMode="numeric" className={field} placeholder="0–11" value={value.age_months ?? ''}
              onChange={(e) => { const m = num(e.target.value); set({ age_months: m != null && m < 12 ? m : null }) }} />
          </label>
        )}
        <label className="text-[11px] text-on-surface-variant">
          Weight ({imperial ? 'lb' : 'kg'}, optional)
          <input inputMode="decimal" className={field} placeholder={imperial ? 'e.g. 26' : 'e.g. 12'}
            value={weightDraft ?? weightShown} onBlur={() => setWeightDraft(null)}
            onChange={(e) => {
              setWeightDraft(e.target.value)
              const n = num(e.target.value)
              set({ weight_kg: n == null ? null : imperial ? Math.round(n * LB_TO_KG * 100) / 100 : n })
            }} />
        </label>
        {showPregnancy && (
          <label className="text-[11px] text-on-surface-variant">
            Pregnant?
            <select className={field} value={value.pregnant ?? ''}
              onChange={(e) => set({ pregnant: (e.target.value || null) as PatientInfo['pregnant'] })}>
              <option value="">Skip</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
              <option value="not_sure">Not sure</option>
            </select>
          </label>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-on-surface-variant">
        {value.for === 'self' && own != null && value.age_years == null
          ? `Using the age from your profile (${own}). `
          : ''}
        Children under 6 follow a separate safety check. Leave the age blank and Liana will ask.
      </p>
    </div>
  )
}
