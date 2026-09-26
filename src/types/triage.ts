export type TriageRequest = {
  symptoms: string
  clinical_context?: string
  image?: File | Blob
}

export type TriageResponse = {
  assessment_id: string
  urgency_level: string
  rationale: string
  possible_conditions: string[]
  recommended_actions: string[]
  disclaimer: string
}

export type TriageChatRequest = {
  symptoms: string
  messages?: string
  /** JSON string: profile details, marked body areas, self-rated severity */
  context?: string
  image?: File | Blob
}

export type CarePlan = {
  immediate_relief: string[]
  food_and_water: string[]
  when_to_hospital: string[]
}

/** The five levels from the AI Engineer Handoff. The app, not the model, decides these. */
export type Urgency = 'EMERGENCY' | 'URGENT' | 'SOON' | 'SELF_CARE' | 'INSUFFICIENT_INFORMATION'

export type TriageIndicator = {
  label: string
  color: 'red' | 'orange' | 'yellow' | 'green' | 'gray'
  icon: string
  priority: number
}

export type FollowUpQuestion = {
  id: string
  text: string
  type: 'single_choice' | 'short_text'
  options: string[]
  required: boolean
}

export type TriageChatResponse = {
  assessment_id: string
  needs_more_info: boolean
  urgency_level: string
  /** No longer produced by the server (the old values were fixed numbers). */
  confidence_score: number | null
  rationale: string
  possible_conditions: string[]
  /** Locked 3-part care plan: immediate relief, food & water, when to go to hospital. */
  care_plan?: CarePlan
  /** Kept for older sessions: recommended_actions/red_flags_to_watch mirror care_plan. */
  recommended_actions: string[]
  follow_up_questions: string[]
  red_flags_to_watch: string[]
  disclaimer: string
  reply?: string
  has_symptoms?: boolean
  is_conversational?: boolean
  /** "gemini" = real AI answer, "rules" = server safety rules only, "offline" = local demo fallback */
  ai_source?: 'gemini' | 'rules' | 'offline'
  ai_notice?: string
  /** Things the assistant just remembered about the user */
  memory_notes?: string[]

  // The handoff result contract. Present on every new answer; older saved sessions don't have it.
  status?: 'question' | 'complete' | 'emergency_stop'
  urgency?: Urgency
  indicator?: TriageIndicator
  summary?: string
  reason?: string | null
  next_steps?: string[]
  escalation?: { required: boolean; message: string | null }
  facility_action?: string | null
  follow_up_question?: FollowUpQuestion | null
  safety_note?: string
  red_flags?: string[]
  warning_signs?: string[]
  rule_version?: string
  medication_notice?: string
  /** Approved-flow state: sent back unchanged on the next message. */
  flow?: Record<string, unknown> | null
  /** The age profile the assessment used (addendum section 4). */
  profile?: { band: AgeBand; label: string; age: string | null; weight_kg: number | null; for: PatientFor } | null
  /** Which approved table was used (typhoid, respiratory, hypertension, diarrhea, under_6), if any. */
  pathway?: string | null
}

export type AgeBand = 'adult' | 'pediatric_6_plus' | 'under_6'
export type PatientFor = 'self' | 'child' | 'other'

/** Who the check is for. Weight is recorded for the future dosage module; triage does not use it. */
export type PatientInfo = {
  for: PatientFor
  age_years?: number | null
  age_months?: number | null
  weight_kg?: number | null
  pregnant?: 'yes' | 'no' | 'not_sure' | null
}

export type CacheStats = {
  hits: number
  misses: number
  hit_rate: number
  size: number
}

export type CacheClearResponse = {
  status: string
}

export type AiPreferences = {
  response_style: 'concise' | 'balanced' | 'detailed'
  tone: 'gentle' | 'direct'
  units: 'metric' | 'imperial'
  language: string
  emergency_number: string
  remember_conversations: boolean
}

export type AiHealthContext = {
  age: number | null
  gender: string
  location: string
  conditions: string[]
  allergies: string[]
  medications: string[]
}

export type AiMemory = {
  preferences: AiPreferences
  health_context: AiHealthContext
  facts: { id: string; text: string; source: string; created_at: string }[]
  history: { at: string; field: string; from: unknown; to: unknown; source: 'user' | 'ai' | 'profile' }[]
  updated_at: string | null
}

export type AiKeyInfo = {
  id: string
  label: string
  masked: string
  model: string
  enabled: boolean
  source: 'env' | 'admin'
  added_at: string | null
  uses: number
  failures: number
  last_used: string | null
  last_error: string
  status: 'unknown' | 'ok' | 'rate_limited' | 'invalid' | 'error' | 'cooling_down'
  cooldown_seconds: number
}

export type AiStatus = { ai_enabled: boolean; keys_total: number; keys_active: number }
