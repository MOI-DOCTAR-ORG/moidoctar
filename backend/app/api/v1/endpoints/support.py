from fastapi import APIRouter, Query
from typing import Optional
from app.schemas.support import SupportRequestPayload, SupportRequestResponse
from app.services import support_service

router = APIRouter()

@router.post("/requests", response_model=SupportRequestResponse)
@router.post("/requests/", response_model=SupportRequestResponse)
def submit_support_request(payload: SupportRequestPayload):
    return support_service.create_support_ticket(
        name=payload.name,
        email=payload.email,
        category=payload.category,
        subject=payload.subject,
        message=payload.message,
        priority=payload.priority,
        ticket_id=payload.ticket_id,
    )

@router.get("/requests")
@router.get("/requests/")
def get_support_requests(email: Optional[str] = Query(None)):
    return {
        "msg": "Success",
        "data": support_service.list_support_tickets(email=email),
    }
