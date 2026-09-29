"""Public support endpoints.

`POST /requests` is the endpoint src/lib/supportRequests.ts has been calling
all along. Until now it did not exist, so every ticket sat in the browser's
localStorage queue and was retried forever.

The response must carry `ticket_id`: the client treats a response without one
as undelivered and re-queues it.
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, get_optional_current_user
from app.schemas.support import SupportRequestIn, SupportRequestOut
from app.services import support_service

router = APIRouter()


@router.post("/requests", response_model=SupportRequestOut)
def create_support_request(
    payload: SupportRequestIn,
    user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    """Accept a support request.

    Deliberately open to signed-out callers: someone who cannot log in still
    needs to reach support. Rate limiting belongs at the edge.
    """
    ticket = support_service.create_ticket(payload.model_dump(), user)
    return {
        "ticket_id": ticket["ticket_id"],
        "status": ticket["status"],
        "created_at": ticket["created_at"],
    }


@router.get("/tickets/mine")
def my_tickets(user: Dict[str, Any] = Depends(get_current_user)):
    """The signed-in user's own tickets, with their replies."""
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
