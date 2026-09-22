from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Form, File, UploadFile
from app.schemas.triage import TriageResponse, TriageChatResponse, TriageListResponse
from app.services.triage_service import (
    analyze_symptoms,
    save_triage_session,
    get_triage_history,
)
from app.api.deps import get_current_user

router = APIRouter()


@router.post("", response_model=TriageResponse)
def perform_triage(
    symptoms: str = Form(...),
    clinical_context: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    full_text = f"{symptoms} {clinical_context or ''}".strip()
    assessment = analyze_symptoms(full_text)
    save_triage_session(current_user["_id"], [symptoms], assessment)

    return TriageResponse(
        assessment_id=assessment["assessment_id"],
        urgency_level=assessment["urgency_level"],
        rationale=assessment["rationale"],
        possible_conditions=assessment["possible_conditions"],
        recommended_actions=assessment["recommended_actions"],
        disclaimer=assessment["disclaimer"],
    )


@router.post("/chat", response_model=TriageChatResponse)
def perform_triage_chat(
    symptoms: str = Form(...),
    messages: Optional[str] = Form("[]"),
    image: Optional[UploadFile] = File(None),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    assessment = analyze_symptoms(symptoms)
    save_triage_session(current_user["_id"], [symptoms], assessment)

    return TriageChatResponse(
        assessment_id=assessment["assessment_id"],
        needs_more_info=assessment["needs_more_info"],
        urgency_level=assessment["urgency_level"],
        confidence_score=assessment["confidence_score"],
        rationale=assessment["rationale"],
        possible_conditions=assessment["possible_conditions"],
        recommended_actions=assessment["recommended_actions"],
        follow_up_questions=assessment["follow_up_questions"],
        red_flags_to_watch=assessment["red_flags_to_watch"],
        disclaimer=assessment["disclaimer"],
    )


@router.get("/list", response_model=TriageListResponse)
@router.get("/history", response_model=TriageListResponse)
def list_triage_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    history = get_triage_history(current_user["_id"])
    return TriageListResponse(msg="Triage history retrieved", data=history)
