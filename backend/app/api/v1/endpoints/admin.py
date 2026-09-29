"""Admin console endpoints.

Every handler here previously returned a success message without writing
anything - demoting a user reported "Role updated successfully" and left them
an admin. These now write for real, through the same store the rest of the
backend uses, and refuse changes that would lock the team out.
"""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import require
from app.core.permissions import (
    P_ADMIN_ACCESS,
    P_AUDIT_READ,
    P_STAFF_MANAGE,
    P_TICKETS_ASSIGN,
    P_TICKETS_READ,
    P_TICKETS_REPLY,
    P_TICKETS_VIEW_HISTORY,
    P_USERS_BLACKLIST,
    P_USERS_READ,
    permissions_for,
    effective_role,
)
from app.core.config import settings
from app.core.email import send_support_reply_email
from app.schemas.support import ReplyIn, TicketPatchIn
from app.services import admin_service, audit_service, support_service
from app.services.admin_service import AdminActionError
from app.services.auth_service import get_user_by_id
from app.services.support_service import TicketError

router = APIRouter()


def _refuse(err: AdminActionError) -> HTTPException:
    code = status.HTTP_404_NOT_FOUND if err.code == "user_not_found" else status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail={"err": err.code, "msg": err.message})


def _refuse_ticket(err: TicketError) -> HTTPException:
    if err.code == "ticket_not_found":
        code = status.HTTP_404_NOT_FOUND
    elif err.code in ("no_consent", "no_account"):
        code = status.HTTP_403_FORBIDDEN
    else:
        code = status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail={"err": err.code, "msg": err.message})


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------


@router.get("/me")
def admin_me(user: Dict[str, Any] = Depends(require(P_ADMIN_ACCESS))):
    """Who the console is talking to, and what they may do.

    The frontend uses this to decide which pages to render. It is a
    convenience: every route below enforces its own permission.
    """
    role = effective_role(user)
    return {
        "msg": "Success",
        "data": {
            "user": user,
            "role": role,
            "permissions": sorted(permissions_for(role)),
        },
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users")
def list_all_users(
    limit: int = Query(200, ge=1, le=500),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(require(P_USERS_READ)),
):
    return {"msg": "Users retrieved", "data": admin_service.list_users(limit=limit, offset=offset)}


@router.get("/user/{user_id}")
def get_user_details(user_id: str, user: Dict[str, Any] = Depends(require(P_USERS_READ))):
    found = get_user_by_id(user_id)
    if not found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"err": "user_not_found", "msg": "No user with that id."},
        )
    return {"msg": "Success", "data": found}


@router.put("/user/role")
def update_user_role(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require(P_STAFF_MANAGE)),
):
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    new_role = str(payload.get("role") or "").strip()
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"err": "missing_user", "msg": "A userId is required."},
        )
    try:
        updated = admin_service.change_user_role(user, user_id, new_role)
    except AdminActionError as e:
        raise _refuse(e)
    return {"msg": "Role updated successfully", "data": updated}


@router.put("/user/blacklist")
def blacklist_user(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require(P_USERS_BLACKLIST)),
):
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    blacklisted = bool(payload.get("blacklisted", True))
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"err": "missing_user", "msg": "A userId is required."},
        )
    try:
        updated = admin_service.set_blacklist(user, user_id, blacklisted)
    except AdminActionError as e:
        raise _refuse(e)
    verb = "blacklisted" if blacklisted else "restored"
    return {"msg": f"User {verb} successfully", "data": updated}


# ---------------------------------------------------------------------------
# Staff
# ---------------------------------------------------------------------------


@router.get("/staff")
def list_staff(user: Dict[str, Any] = Depends(require(P_STAFF_MANAGE))):
    return {"msg": "Staff retrieved", "data": admin_service.list_operators()}


@router.post("/staff")
def add_staff(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(require(P_STAFF_MANAGE)),
):
    user_id = str(payload.get("userId") or payload.get("user_id") or "").strip()
    role = str(payload.get("role") or "staff").strip()
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"err": "missing_user", "msg": "A userId is required."},
        )
    try:
        updated = admin_service.change_user_role(user, user_id, role)
    except AdminActionError as e:
        raise _refuse(e)
    return {"msg": "Staff member added", "data": updated}


@router.delete("/staff/{user_id}")
def remove_staff(user_id: str, user: Dict[str, Any] = Depends(require(P_STAFF_MANAGE))):
    try:
        updated = admin_service.remove_staff(user, user_id)
    except AdminActionError as e:
        raise _refuse(e)
    return {"msg": "Staff member removed", "data": updated}


# ---------------------------------------------------------------------------
# Tickets
# ---------------------------------------------------------------------------


@router.get("/tickets")
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_to: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(require(P_TICKETS_READ)),
):
    rows, total = support_service.list_tickets(
        status=status_filter, assigned_to=assigned_to, limit=limit, offset=offset
    )
    return {"msg": "Tickets retrieved", "data": rows, "total": total}


@router.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: str, user: Dict[str, Any] = Depends(require(P_TICKETS_READ))):
    ticket = support_service.get_ticket(ticket_id)
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"err": "ticket_not_found", "msg": "No ticket with that reference."},
        )
    return {
        "msg": "Success",
        "data": {**ticket, "messages": support_service.list_messages(ticket_id)},
    }


@router.post("/tickets/{ticket_id}/reply")
def reply_to_ticket(
    ticket_id: str,
    body: ReplyIn,
    user: Dict[str, Any] = Depends(require(P_TICKETS_REPLY)),
):
    try:
        message = support_service.add_reply(user, ticket_id, body.body)
    except TicketError as e:
        raise _refuse_ticket(e)

    # The reply is already stored. Email is a notification, so a send failure
    # is reported but never loses the reply.
    ticket = support_service.get_ticket(ticket_id) or {}
    delivered, detail = send_support_reply_email(
        to_email=str(ticket.get("email") or ""),
        ticket_id=ticket_id,
        subject_line=str(ticket.get("subject") or "your request"),
        reply_body=body.body,
        app_url=settings.frontend_support_url,
    )
    return {
        "msg": "Reply sent" if delivered else "Reply saved, but the email could not be delivered",
        "data": message,
        "email_delivered": delivered,
        "email_error": None if delivered else detail,
    }


@router.patch("/tickets/{ticket_id}")
def patch_ticket(
    ticket_id: str,
    patch: TicketPatchIn,
    user: Dict[str, Any] = Depends(require(P_TICKETS_ASSIGN)),
):
    try:
        updated = support_service.update_ticket(
            user, ticket_id, patch.model_dump(exclude_unset=True)
        )
    except TicketError as e:
        raise _refuse_ticket(e)
    return {"msg": "Ticket updated", "data": updated}


@router.get("/tickets/{ticket_id}/history")
def get_ticket_history(
    ticket_id: str,
    user: Dict[str, Any] = Depends(require(P_TICKETS_VIEW_HISTORY)),
):
    """Refuses unless the reporter allowed it on this ticket."""
    try:
        data = support_service.get_ticket_history(user, ticket_id)
    except TicketError as e:
        raise _refuse_ticket(e)
    return {"msg": "Success", "data": data}


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------


@router.get("/audit")
def list_audit(
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: Dict[str, Any] = Depends(require(P_AUDIT_READ)),
):
    return {"msg": "Audit retrieved", "data": audit_service.list_entries(limit=limit, offset=offset)}
