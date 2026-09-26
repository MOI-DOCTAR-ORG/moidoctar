from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class TriageRequest(BaseModel):
    symptoms: str
    clinical_context: Optional[str] = None


class TriageResponse(BaseModel):
    assessment_id: str
    urgency_level: str
    rationale: str
    possible_conditions: List[str]
    recommended_actions: List[str]
    disclaimer: str
    ai_source: str = "rules"
    ai_notice: str = ""
    # The AI Engineer Handoff result contract (section 4). The fields above are kept
    # for the current frontend and are derived from these.
    status: Optional[str] = None
    urgency: Optional[str] = None
    indicator: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    reason: Optional[str] = None
    next_steps: List[str] = []
    escalation: Optional[Dict[str, Any]] = None
    facility_action: Optional[str] = None
    follow_up_question: Optional[Dict[str, Any]] = None
    safety_note: Optional[str] = None
    red_flags: List[str] = []
    warning_signs: List[str] = []
    rule_version: Optional[str] = None
    medication_notice: str = ""
    # Approved-flow state (sent back by the client) and the age profile used (addendum 4).
    flow: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None
    pathway: Optional[str] = None


class TriageChatRequest(BaseModel):
    symptoms: str
    messages: Optional[str] = "[]"


class TriageChatResponse(BaseModel):
    assessment_id: str
    needs_more_info: bool
    urgency_level: str
    # No longer produced: the old values were fixed numbers, not a measured confidence.
    confidence_score: Optional[float] = None
    rationale: str
    possible_conditions: List[str]
    recommended_actions: List[str]
    follow_up_questions: List[str]
    red_flags_to_watch: List[str]
    disclaimer: str
    reply: Optional[str] = ""
    has_symptoms: Optional[bool] = False
    is_conversational: Optional[bool] = False
    ai_source: str = "rules"  # "gemini" | "rules"
    ai_notice: str = ""
    memory_notes: List[str] = []
    # The AI Engineer Handoff result contract (section 4). The fields above are kept
    # for the current frontend and are derived from these.
    status: Optional[str] = None
    urgency: Optional[str] = None
    indicator: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    reason: Optional[str] = None
    next_steps: List[str] = []
    escalation: Optional[Dict[str, Any]] = None
    facility_action: Optional[str] = None
    follow_up_question: Optional[Dict[str, Any]] = None
    safety_note: Optional[str] = None
    red_flags: List[str] = []
    warning_signs: List[str] = []
    rule_version: Optional[str] = None
    medication_notice: str = ""
    # Approved-flow state (sent back by the client) and the age profile used (addendum 4).
    flow: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None
    pathway: Optional[str] = None


class BackendTriageStatus(BaseModel):
    level: str  # 'Emergency' | 'Urgent' | 'Non-Urgent'


class BackendTriageItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    # Pydantic v2 treats a leading-underscore name as private and never serialises it, so alias it.
    id: str = Field(alias="_id")
    symptoms: List[str]
    duration: str = "Recent"
    severity: str = "Moderate"  # 'Mild' | 'Moderate' | 'Severe'
    notes: Optional[str] = ""
    triageStatus: BackendTriageStatus
    actionPlan: str
    createdAt: str
    possible_conditions: Optional[List[str]] = []
    recommended_actions: Optional[List[str]] = []
    urgency_level: Optional[str] = None
    rationale: Optional[str] = ""


class TriageListResponse(BaseModel):
    msg: str = "Triage history retrieved"
    data: List[BackendTriageItem]


class CacheStats(BaseModel):
    hits: int
    misses: int
    hit_rate: float
    size: int


class CacheClearResponse(BaseModel):
    status: str
