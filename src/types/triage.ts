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

export type TriageChatResponse = {
  assessment_id: string
  needs_more_info: boolean
  urgency_level: string
  confidence_score: number
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
