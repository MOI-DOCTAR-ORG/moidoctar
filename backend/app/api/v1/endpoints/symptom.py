from typing import Dict, Any
from fastapi import APIRouter, Depends
from app.schemas.symptom import SymptomCreate, SymptomListResponse
from app.services.symptom_service import get_user_symptoms, log_symptom
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/list")
def list_symptoms(current_user: Dict[str, Any] = Depends(get_current_user)):
    symptoms = get_user_symptoms(current_user["_id"])
    return {"msg": "Symptoms retrieved", "data": symptoms}


@router.post("")
def record_symptom(
    symptom: SymptomCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    entry = log_symptom(current_user["_id"], symptom.model_dump())
    return {"msg": "Symptom recorded", "data": entry}
