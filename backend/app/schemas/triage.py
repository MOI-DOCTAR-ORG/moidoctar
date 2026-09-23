from typing import Optional, List
from pydantic import BaseModel


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


class TriageChatRequest(BaseModel):
    symptoms: str
    messages: Optional[str] = "[]"


class TriageChatResponse(BaseModel):
    assessment_id: str
    needs_more_info: bool
    urgency_level: str
    confidence_score: float
    rationale: str
    possible_conditions: List[str]
    recommended_actions: List[str]
    follow_up_questions: List[str]
    red_flags_to_watch: List[str]
    disclaimer: str
    reply: Optional[str] = None
    has_symptoms: Optional[bool] = False
    is_conversational: Optional[bool] = False


class BackendTriageStatus(BaseModel):
    level: str  # 'Emergency' | 'Urgent' | 'Non-Urgent'


class BackendTriageItem(BaseModel):
    _id: str
    symptoms: List[str]
    duration: str = "Recent"
    severity: str = "Moderate"  # 'Mild' | 'Moderate' | 'Severe'
    notes: Optional[str] = ""
    triageStatus: BackendTriageStatus
    actionPlan: str
    createdAt: str


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
