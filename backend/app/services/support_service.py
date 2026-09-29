"""Support tickets: storage, replies, and the consent gate on medical history.

Before this existed, `POST /support/requests` was unimplemented. The Support
page posted, got no acknowledgement, and queued the request in the browser's
localStorage forever. Tickets never reached anyone.

Two details matter for that history:

  - The response MUST carry `ticket_id`. src/lib/supportRequests.ts treats a
    response without one as undelivered and re-queues it, so a bare 200 leaves
    tickets stuck on devices.
  - Devices may still hold queued tickets that flush all at once the moment
    this goes live. `queued_at` from the client sets `created_at`, so an old
    request does not masquerade as new.
"""
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.core.supabase import get_supabase_client, safe_supabase_rows
from app.services import audit_service

logger = logging.getLogger("moidoctar.support")

TICKETS_TABLE = "support_tickets"
MESSAGES_TABLE = "support_ticket_messages"

STATUS_OPEN = "open"
STATUS_PENDING = "pending"
STATUS_RESOLVED = "resolved"
VALID_STATUSES = (STATUS_OPEN, STATUS_PENDING, STATUS_RESOLVED)
VALID_PRIORITIES = ("normal", "urgent")

# Local fallback, mirroring the rest of the backend's Supabase-or-memory shape.
_local_tickets: Dict[str, Dict[str, Any]] = {}
_local_messages: Dict[str, List[Dict[str, Any]]] = {}

# Matches the client's generator in src/lib/supportRequests.ts (SUP-XXXXXX).
_TICKET_ID_RE = re.compile(r"^SUP-[A-Z0-9]{4,12}$")


class TicketError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _mint_ticket_id() -> str:
    return f"SUP-{uuid.uuid4().hex[:6].upper()}"


def _valid_client_id(value: Optional[str]) -> bool:
    return bool(value and _TICKET_ID_RE.match(value.strip().upper()))


def create_ticket(payload: Dict[str, Any], user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Store an incoming support request and return it."""
    raw_id = str(payload.get("ticket_id") or "").strip().upper()
    ticket_id = raw_id if _valid_client_id(raw_id) else _mint_ticket_id()

    # A request that waited in the browser queue keeps the time it was written.
    created_at = str(payload.get("queued_at") or "").strip() or _now()

    priority = str(payload.get("priority") or "normal").lower()
    if priority not in VALID_PRIORITIES:
        priority = "normal"

    ticket = {
        "ticket_id": ticket_id,
        "user_id": str(user.get("_id")) if user else None,
        "name": str(payload.get("name") or "").strip(),
        "email": str(payload.get("email") or "").strip().lower(),
        "category": str(payload.get("category") or "General").strip(),
        "subject": str(payload.get("subject") or "").strip(),
        "message": str(payload.get("message") or "").strip(),
        "priority": priority,
        "status": STATUS_OPEN,
        "assigned_to": None,
        "consent_share_history": bool(payload.get("consent_share_history", False)),
        "created_at": created_at,
        "updated_at": _now(),
    }

    supabase = get_supabase_client()
    if supabase:
        try:
            # A re-sent ticket from a device queue must not create a duplicate.
            existing = (
                supabase.table(TICKETS_TABLE)
                .select("*")
                .eq("ticket_id", ticket_id)
                .execute()
            )
            existing_rows = safe_supabase_rows(existing)
            if existing_rows:
                # Return the stored row, not the one just built: a re-send must
                # not report back values the database never accepted.
                return existing_rows[0]
            res = supabase.table(TICKETS_TABLE).insert(ticket).execute()
            rows = safe_supabase_rows(res)
            return rows[0] if rows else ticket
        except Exception as e:
            logger.error("Supabase ticket insert failed, storing locally: %s", e)

    if ticket_id not in _local_tickets:
        _local_tickets[ticket_id] = ticket
        _local_messages[ticket_id] = []
    return _local_tickets[ticket_id]


def list_tickets(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """Tickets newest first, with the unfiltered total for pagination."""
    limit = max(1, min(limit, 200))

    supabase = get_supabase_client()
    if supabase:
        try:
            q = supabase.table(TICKETS_TABLE).select("*")
            if status:
                q = q.eq("status", status)
            if assigned_to:
                q = q.eq("assigned_to", assigned_to)
            res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
            rows = safe_supabase_rows(res)

            count_q = supabase.table(TICKETS_TABLE).select("ticket_id")
            if status:
                count_q = count_q.eq("status", status)
            if assigned_to:
                count_q = count_q.eq("assigned_to", assigned_to)
            total = len(safe_supabase_rows(count_q.execute()))
            return rows, total
        except Exception as e:
            logger.error("Supabase ticket listing failed, falling back to local: %s", e)

    rows = list(_local_tickets.values())
    if status:
        rows = [t for t in rows if t.get("status") == status]
    if assigned_to:
        rows = [t for t in rows if t.get("assigned_to") == assigned_to]
    rows.sort(key=lambda t: str(t.get("created_at") or ""), reverse=True)
    return rows[offset:offset + limit], len(rows)


def get_ticket(ticket_id: str) -> Optional[Dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table(TICKETS_TABLE).select("*").eq("ticket_id", ticket_id).execute()
            rows = safe_supabase_rows(res)
            if rows:
                return rows[0]
        except Exception as e:
            logger.error("Supabase ticket read failed, falling back to local: %s", e)

    return _local_tickets.get(ticket_id)


def list_messages(ticket_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = (
                supabase.table(MESSAGES_TABLE)
                .select("*")
                .eq("ticket_id", ticket_id)
                .order("created_at", desc=False)
                .execute()
            )
            return safe_supabase_rows(res)
        except Exception as e:
            logger.error("Supabase message read failed, falling back to local: %s", e)

    return list(_local_messages.get(ticket_id, []))


def list_tickets_for_user(user_id: str, email: str) -> List[Dict[str, Any]]:
    """A user's own tickets, matched on account id or the address they used."""
    supabase = get_supabase_client()
    if supabase:
        try:
            by_id = safe_supabase_rows(
                supabase.table(TICKETS_TABLE).select("*").eq("user_id", user_id).execute()
            )
            by_email = safe_supabase_rows(
                supabase.table(TICKETS_TABLE).select("*").eq("email", email.lower()).execute()
            )
            merged = {t["ticket_id"]: t for t in by_id + by_email}
            rows = list(merged.values())
            rows.sort(key=lambda t: str(t.get("created_at") or ""), reverse=True)
            return rows
        except Exception as e:
            logger.error("Supabase user ticket read failed, falling back to local: %s", e)

    rows = [
        t for t in _local_tickets.values()
        if str(t.get("user_id") or "") == str(user_id) or str(t.get("email") or "") == email.lower()
    ]
    rows.sort(key=lambda t: str(t.get("created_at") or ""), reverse=True)
    return rows


def _touch(ticket_id: str, changes: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    changes = {**changes, "updated_at": _now()}
    supabase = get_supabase_client()
    if supabase:
        try:
            res = (
                supabase.table(TICKETS_TABLE)
                .update(changes)
                .eq("ticket_id", ticket_id)
                .execute()
            )
            rows = safe_supabase_rows(res)
            if rows:
                return rows[0]
        except Exception as e:
            logger.error("Supabase ticket update failed, falling back to local: %s", e)

    ticket = _local_tickets.get(ticket_id)
    if ticket:
        ticket.update(changes)
        return ticket
    return None


def update_ticket(actor: Dict[str, Any], ticket_id: str, patch: Dict[str, Any]) -> Dict[str, Any]:
    """Change status, priority or assignee."""
    ticket = get_ticket(ticket_id)
    if not ticket:
        raise TicketError("ticket_not_found", "No ticket with that reference.")

    changes: Dict[str, Any] = {}

    if patch.get("status") is not None:
        status = str(patch["status"]).lower()
        if status not in VALID_STATUSES:
            raise TicketError("invalid_status", f"Status must be one of: {', '.join(VALID_STATUSES)}.")
        changes["status"] = status

    if patch.get("priority") is not None:
        priority = str(patch["priority"]).lower()
        if priority not in VALID_PRIORITIES:
            raise TicketError("invalid_priority", f"Priority must be one of: {', '.join(VALID_PRIORITIES)}.")
        changes["priority"] = priority

    if patch.get("assigned_to") is not None:
        # An explicit empty string unassigns.
        changes["assigned_to"] = str(patch["assigned_to"]).strip() or None

    if not changes:
        return ticket

    updated = _touch(ticket_id, changes) or ticket
    audit_service.record(actor, "ticket.updated", target_id=ticket_id, detail=changes)
    return updated


def add_reply(actor: Dict[str, Any], ticket_id: str, body: str) -> Dict[str, Any]:
    """Store a staff reply. Storage is what makes the reply real; email is a
    notification, and a send failure must never lose it."""
    ticket = get_ticket(ticket_id)
    if not ticket:
        raise TicketError("ticket_not_found", "No ticket with that reference.")

    message = {
        "id": str(uuid.uuid4()),
        "ticket_id": ticket_id,
        "body": body.strip(),
        "is_staff": True,
        "author_id": str(actor.get("_id") or ""),
        "author_name": str(actor.get("userName") or "Support"),
        "created_at": _now(),
    }

    supabase = get_supabase_client()
    stored = message
    if supabase:
        try:
            res = supabase.table(MESSAGES_TABLE).insert(message).execute()
            rows = safe_supabase_rows(res)
            stored = rows[0] if rows else message
        except Exception as e:
            logger.error("Supabase reply insert failed, storing locally: %s", e)
            _local_messages.setdefault(ticket_id, []).append(message)
    else:
        _local_messages.setdefault(ticket_id, []).append(message)

    # A replied ticket is awaiting the user, not sitting in the open queue.
    _touch(ticket_id, {"status": STATUS_PENDING})
    audit_service.record(actor, "ticket.replied", target_id=ticket_id)
    return stored


def get_ticket_history(actor: Dict[str, Any], ticket_id: str) -> Dict[str, Any]:
    """The reporter's triage history, if and only if they allowed it.

    The audit entry is written before the data is returned, so a storage
    problem cannot produce an unrecorded read of someone's medical history.
    """
    ticket = get_ticket(ticket_id)
    if not ticket:
        raise TicketError("ticket_not_found", "No ticket with that reference.")

    if not ticket.get("consent_share_history"):
        raise TicketError(
            "no_consent",
            "This user did not share their triage history for this ticket.",
        )

    user_id = ticket.get("user_id")
    if not user_id:
        raise TicketError(
            "no_account",
            "This ticket was filed without a signed-in account, so there is no history to show.",
        )

    audit_service.record(
        actor,
        "ticket.history_viewed",
        target_id=ticket_id,
        detail={"subject_user_id": user_id},
    )

    supabase = get_supabase_client()
    sessions: List[Dict[str, Any]] = []
    if supabase:
        try:
            res = (
                supabase.table("triage_sessions")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(20)
                .execute()
            )
            sessions = safe_supabase_rows(res)
        except Exception as e:
            logger.error("Triage history read failed: %s", e)

    return {"ticket_id": ticket_id, "user_id": user_id, "sessions": sessions}
