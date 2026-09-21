from typing import Optional, List, Literal
from pydantic import BaseModel


class MedicationCreate(BaseModel):
    name: str
    dosage: str
    time: str
    frequent: Literal["morning", "afternoon", "night"] = "morning"
    supply: str = "30"


class MedicationStop(BaseModel):
    id: str


class MedicationOut(BaseModel):
    id: str
    name: str
    dosage: str
    time: str
    frequent: Literal["morning", "afternoon", "night"]
    supply: str
    status: bool = True
    startedAt: str
    stoppedAt: Optional[str] = None


class MedicationListResponse(BaseModel):
    msg: str = "Medications retrieved"
    data: List[MedicationOut]
