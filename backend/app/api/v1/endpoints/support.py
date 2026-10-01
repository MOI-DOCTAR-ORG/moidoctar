from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.api.deps import get_current_user, get_optional_current_user
from app.schemas.support import SupportRequestPayload, SupportRequestResponse
from app.services import support_chat, support_service

router = APIRouter()


@router.post("/requests", response_model=SupportRequestResponse)
@router.post("/requests/", response_model=SupportRequestResponse)
def submit_support_request(
    payload: SupportRequestPayload,
    # Deliberately optional: someone who cannot log in still needs to reach
    # support. When they are signed in we record who filed it, which is what
    # makes the consent-gated history lookup possible later.
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    return support_service.create_support_ticket(
        name=payload.name,
        email=payload.email,
        category=payload.category,
        subject=payload.subject,
        message=payload.message,
        priority=payload.priority,
        ticket_id=payload.ticket_id,
        consent_share_history=payload.consent_share_history,
        queued_at=payload.queued_at,
        user=user,
    )


@router.get("/requests")
@router.get("/requests/")
def get_support_requests(email: Optional[str] = Query(None)):
    return {
        "msg": "Success",
        "data": support_service.list_support_tickets(email=email),
    }


@router.get("/tickets/mine")
def my_tickets(user: Dict[str, Any] = Depends(get_current_user)):
    """The signed-in user's own tickets, with any staff replies."""
    tickets = support_service.list_tickets_for_user(
        str(user.get("_id") or ""), str(user.get("email") or "")
    )
    return {
        "msg": "Tickets retrieved",
        "data": [
            {**t, "messages": support_service.list_messages(t["ticket_id"])}
            for t in tickets
        ],
    }


class SupportChatTurn(BaseModel):
    role: str = "user"
    text: str = ""


class SupportGuide(BaseModel):
    id: str
    title: str = ""
    text: str = ""


class SupportChatPayload(BaseModel):
    message: str = Field("", max_length=1000)
    history: List[SupportChatTurn] = Field(default_factory=list, max_length=20)
    guides: List[SupportGuide] = Field(default_factory=list, max_length=12)


@router.post("/chat")
async def support_chat_reply(payload: SupportChatPayload, user: Dict[str, Any] = Depends(get_current_user)):
    """Gemini answer for the Support page chat. 503 when the model cannot answer; the page then
    uses its own keyword answers."""
    try:
        return await run_in_threadpool(
            support_chat.answer, payload.message, [t.model_dump() for t in payload.history],
            [g.model_dump() for g in payload.guides])
    except support_chat.Unavailable:
        raise HTTPException(503, detail={"err": "ai_unavailable", "msg": "The support assistant is not available right now."})
