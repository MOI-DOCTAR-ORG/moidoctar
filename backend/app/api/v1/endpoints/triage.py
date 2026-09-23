import json
import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, Request, UploadFile
from app.schemas.triage import TriageResponse, TriageChatResponse, TriageListResponse
from app.services.triage_service import (
    analyze_symptoms,
    save_triage_session,
    get_triage_history,
)
from app.api.deps import get_current_user

logger = logging.getLogger("moidoctar.triage")
router = APIRouter()


async def _extract_triage_data(request: Request):
    """Gracefully accept triage payloads in JSON, FormData, or URL-encoded form."""
    content_type = (request.headers.get("content-type") or "").lower()
    symptoms = ""
    clinical_context = ""
    messages = "[]"
    image: Optional[UploadFile] = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            if isinstance(body, dict):
                symptoms = str(body.get("symptoms") or "").strip()
                clinical_context = str(body.get("clinical_context") or "").strip()
                msgs = body.get("messages")
                if isinstance(msgs, (list, dict)):
                    messages = json.dumps(msgs)
                elif isinstance(msgs, str):
                    messages = msgs
        except Exception as e:
            logger.debug(f"Could not parse JSON body: {e}")
    else:
        try:
            form = await request.form()
            symptoms = str(form.get("symptoms") or "").strip()
            clinical_context = str(form.get("clinical_context") or "").strip()
            msgs = form.get("messages")
            if isinstance(msgs, str):
                messages = msgs
            img = form.get("image")
            if isinstance(img, UploadFile):
                image = img
        except Exception as e:
            logger.debug(f"Could not parse form body: {e}")

    return symptoms, clinical_context, messages, image


@router.post("", response_model=TriageResponse)
async def perform_triage(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    symptoms, clinical_context, _, _ = await _extract_triage_data(request)
    full_text = f"{symptoms} {clinical_context}".strip()
    if not full_text:
        full_text = "General symptom assessment"

    assessment = analyze_symptoms(full_text)
    user_id = current_user.get("_id") or current_user.get("id") or "user"
    save_triage_session(user_id, [symptoms or full_text], assessment)

    return TriageResponse(
        assessment_id=assessment["assessment_id"],
        urgency_level=assessment["urgency_level"],
        rationale=assessment["rationale"],
        possible_conditions=assessment["possible_conditions"],
        recommended_actions=assessment["recommended_actions"],
        disclaimer=assessment["disclaimer"],
    )


@router.post("/chat", response_model=TriageChatResponse)
async def perform_triage_chat(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    symptoms, _, messages, _ = await _extract_triage_data(request)
    if not symptoms:
        symptoms = "General symptom assessment"

    assessment = analyze_symptoms(symptoms)
    user_id = current_user.get("_id") or current_user.get("id") or "user"
    save_triage_session(user_id, [symptoms], assessment)

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
    user_id = current_user.get("_id") or current_user.get("id") or "user"
    history = get_triage_history(user_id)
    return TriageListResponse(msg="Triage history retrieved", data=history)
