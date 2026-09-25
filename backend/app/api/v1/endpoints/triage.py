import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, Request, UploadFile
from fastapi.concurrency import run_in_threadpool

from app.api.deps import get_current_user
from app.schemas.triage import TriageChatResponse, TriageListResponse, TriageResponse
from app.services.triage_service import (
    analyze_conversation,
    analyze_symptoms,
    analyze_symptoms_chat,
    get_triage_history,
    save_triage_session,
)

logger = logging.getLogger("moidoctar.triage")
router = APIRouter()

MAX_IMAGE_BYTES = 4 * 1024 * 1024


def _as_obj(value: Any, default: Any) -> Any:
    if isinstance(value, str):
        try:
            return json.loads(value)
        except ValueError:
            return default
    return value if value is not None else default


async def _extract(request: Request) -> Tuple[str, str, List[Dict[str, str]], Dict[str, Any], Optional[bytes], str]:
    """Accept JSON or multipart. Returns symptoms, clinical_context, messages, context, image_bytes, image_mime."""
    ctype = (request.headers.get("content-type") or "").lower()
    symptoms = clinical = ""
    messages: Any = []
    context: Any = {}
    image_bytes: Optional[bytes] = None
    image_mime = "image/jpeg"
    try:
        if "application/json" in ctype:
            body = await request.json()
            if isinstance(body, dict):
                symptoms = str(body.get("symptoms") or "").strip()
                clinical = str(body.get("clinical_context") or "").strip()
                messages, context = _as_obj(body.get("messages"), []), _as_obj(body.get("context"), {})
        else:
            form = await request.form()
            symptoms = str(form.get("symptoms") or "").strip()
            clinical = str(form.get("clinical_context") or "").strip()
            messages, context = _as_obj(form.get("messages"), []), _as_obj(form.get("context"), {})
            img = form.get("image")
            if isinstance(img, UploadFile):
                data = await img.read()
                if 0 < len(data) <= MAX_IMAGE_BYTES:
                    image_bytes, image_mime = data, img.content_type or "image/jpeg"
    except Exception as exc:
        logger.warning("Could not parse triage request: %s", exc)
    if not isinstance(messages, list):
        messages = []
    messages = [m for m in messages if isinstance(m, dict)]
    return symptoms, clinical, messages, context if isinstance(context, dict) else {}, image_bytes, image_mime


def _user_id(user: Dict[str, Any]) -> str:
    return str(user.get("_id") or user.get("id") or "user")


@router.post("", response_model=TriageResponse)
async def perform_triage(request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    symptoms, clinical, _, context, img, mime = await _extract(request)
    text = f"{symptoms} {clinical}".strip() or "General symptom assessment"
    uid = _user_id(current_user)
    a = await run_in_threadpool(analyze_conversation, uid, text, [{"role": "user", "content": text}], context, img, mime)
    save_triage_session(uid, [symptoms or text], a)
    return TriageResponse(
        assessment_id=a["assessment_id"], urgency_level=a["urgency_level"], rationale=a["rationale"],
        possible_conditions=a["possible_conditions"], recommended_actions=a["recommended_actions"],
        disclaimer=a["disclaimer"], ai_source=a["ai_source"], ai_notice=a["ai_notice"],
    )


@router.post("/chat", response_model=TriageChatResponse)
async def perform_triage_chat(request: Request, current_user: Dict[str, Any] = Depends(get_current_user)):
    symptoms, _, messages, context, img, mime = await _extract(request)
    uid = _user_id(current_user)
    a = await run_in_threadpool(analyze_conversation, uid, symptoms or "General symptom assessment", messages, context, img, mime)
    user_lines = [str(m.get("content") or m.get("text") or "") for m in messages if str(m.get("role")) == "user"]
    if a.get("has_symptoms", True):
        save_triage_session(uid, [(user_lines[0] if user_lines else symptoms) or "Symptom check"], a,
                            session_id=str(context.get("session_id") or "") or None)
    return TriageChatResponse(
        assessment_id=a["assessment_id"],
        needs_more_info=a.get("needs_more_info", False),
        urgency_level=a.get("urgency_level", "Stable"),
        confidence_score=a.get("confidence_score", 0.9),
        rationale=a.get("rationale", ""),
        possible_conditions=a.get("possible_conditions", []),
        recommended_actions=a.get("recommended_actions", []),
        follow_up_questions=a.get("follow_up_questions", []),
        red_flags_to_watch=a.get("red_flags_to_watch", []),
        disclaimer=a.get("disclaimer", "MoiDoctar provides triage guidance, not a medical diagnosis."),
        reply=a.get("reply") or a.get("rationale", ""),
        has_symptoms=bool(a.get("has_symptoms", False)),
        is_conversational=bool(a.get("is_conversational", False)),
        ai_source=a.get("ai_source", "rules"),
        ai_notice=a.get("ai_notice", ""),
        memory_notes=a.get("memory_notes", []),
    )


@router.get("/list", response_model=TriageListResponse)
@router.get("/history", response_model=TriageListResponse)
def list_triage_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    return TriageListResponse(msg="Triage history retrieved", data=get_triage_history(_user_id(current_user)))
