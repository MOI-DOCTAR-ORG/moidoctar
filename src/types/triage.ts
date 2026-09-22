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
  image?: File | Blob
}

export type TriageChatResponse = {
  assessment_id: string
  needs_more_info: boolean
  urgency_level: string
  confidence_score: number
  rationale: string
  possible_conditions: string[]
  recommended_actions: string[]
  follow_up_questions: string[]
  red_flags_to_watch: string[]
  disclaimer: string
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
