from typing import Dict, Any
from fastapi import APIRouter, Depends
from app.schemas.medication import MedicationCreate, MedicationStop, MedicationListResponse
from app.services.medication_service import get_user_medications, add_medication, stop_medication
from app.api.deps import get_current_user

router = APIRouter()


@router.get("", response_model=MedicationListResponse)
def list_medications(current_user: Dict[str, Any] = Depends(get_current_user)):
    meds = get_user_medications(current_user["_id"])
    return MedicationListResponse(msg="Medications retrieved", data=meds)


@router.post("/create", response_model=MedicationListResponse)
def create_medication(
    med: MedicationCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    meds = add_medication(current_user["_id"], med.model_dump())
    return MedicationListResponse(msg="Medication added successfully", data=meds)


@router.put("/stop", response_model=MedicationListResponse)
def archive_medication(
    req: MedicationStop,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    meds = stop_medication(current_user["_id"], req.id)
    return MedicationListResponse(msg="Medication status updated", data=meds)
