from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class SymptomCreate(BaseModel):
    symptom_name: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class SymptomOut(BaseModel):
    id: str
    symptom_name: Optional[str] = None
    severity: Optional[str] = None
    notes: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    logged_at: str


class SymptomListResponse(BaseModel):
    msg: str = "Symptoms retrieved"
    data: List[SymptomOut]
