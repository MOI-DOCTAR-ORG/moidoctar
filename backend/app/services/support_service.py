"""Support tickets: storage, replies, and the consent gate on medical history.

This merges two implementations. The storage layer and the public
`create_support_ticket` / `list_support_tickets` contract come from the version
already wired to the Support page, including its category normalisation and the
confirmation email on submission. Layered on top are the pieces the admin
console needs: staff replies, assignment and status, an audit trail, and a
consent gate on the reporter's triage history.

Storage is `kv_store`, which already handles Supabase-or-local itself, rather
than dedicated tables - one less thing to provision, and it keeps working in a
deployment with no Supabase configured.

Two details matter for the client:

  - The response MUST carry `ticket_id`. src/lib/supportRequests.ts treats a
    response without one as undelivered and re-queues it, so a bare 200 leaves
    tickets stuck on devices.
  - Devices may hold queued tickets that flush all at once. `queued_at` from
    the client sets `created_at`, so an old request does not look new.
"""
import datetime
import logging
import random
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from app.core.email import send_support_ticket_email
from app.services import audit_service
from app.services.kv_store import kv_get, kv_set

logger = logging.getLogger("moidoctar.support")

TICKETS_KEY = "support_tickets"
MESSAGES_KEY = "support_ticket_messages"

# Keep at most this many tickets in the store.
MAX_TICKETS = 200

CATEGORIES = [
    'Triage',
    'Tracking',
    'Reminders',
    'Care & safety',
    'Account & privacy',
    'Bug report',
    'Billing',
    'Something else',
]

STATUS_OPEN = "open"
STATUS_PENDING = "pending"
STATUS_RESOLVED = "resolved"
VALID_STATUSES = (STATUS_OPEN, STATUS_PENDING, STATUS_RESOLVED)
VALID_PRIORITIES = ("normal", "urgent")

# Matches the client's generator in src/lib/supportRequests.ts (SUP-XXXXXX).
_TICKET_ID_RE = re.compile(r"^SUP-[A-Z0-9]{4,12}$")


class TicketError(Exception):
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _now() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def generate_ticket_id() -> str:
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    suffix = ''.join(random.choice(alphabet) for _ in range(6))
    return f"SUP-{suffix}"


def _read_tickets() -> List[Dict[str, Any]]:
    tickets = kv_get(TICKETS_KEY, [])
    return tickets if isinstance(tickets, list) else []


def _write_tickets(tickets: List[Dict[str, Any]]) -> None:
    kv_set(TICKETS_KEY, tickets[:MAX_TICKETS])


def _read_messages() -> Dict[str, List[Dict[str, Any]]]:
    messages = kv_get(MESSAGES_KEY, {})
    return messages if isinstance(messages, dict) else {}


def _write_messages(messages: Dict[str, List[Dict[str, Any]]]) -> None:
    kv_set(MESSAGES_KEY, messages)


def create_support_ticket(
    name: str,
    email: str,
    category: str,
    subject: str,
    message: str,
    priority: str = "normal",
    ticket_id: Optional[str] = None,
    consent_share_history: bool = False,
    queued_at: Optional[str] = None,
    user: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Store an incoming support request and send its confirmation email."""
    raw_id = (ticket_id or "").strip().upper()
    tid = raw_id if _TICKET_ID_RE.match(raw_id) else generate_ticket_id()

    clean_cat = category if category in CATEGORIES else "Something else"
    clean_name = name.strip()
    clean_email = email.strip().lower()
    clean_subj = subject.strip()
    clean_msg = message.strip()

    clean_priority = (priority or "normal").lower()
    if clean_priority not in VALID_PRIORITIES:
        clean_priority = "normal"

    ticket = {
        "ticket_id": tid,
        "user_id": str(user.get("_id")) if user else None,
        "name": clean_name,
        "email": clean_email,
        "category": clean_cat,
        "subject": clean_subj,
        "message": clean_msg,
        "priority": clean_priority,
        "status": STATUS_OPEN,
        "assigned_to": None,
        "consent_share_history": bool(consent_share_history),
        # A request that waited in the browser queue keeps the time it was written.
        "created_at": (queued_at or "").strip() or _now(),
        "updated_at": _now(),
    }

    tickets = _read_tickets()
    # A ticket re-sent from a device queue replaces rather than duplicates.
    tickets = [t for t in tickets if t.get("ticket_id") != tid]
    tickets.insert(0, ticket)
    _write_tickets(tickets)

    logger.info("Support ticket created: %s (%s) for %s", tid, clean_cat, clean_email)

    email_delivered = False
    try:
        ok, detail = send_support_ticket_email(
            to_email=clean_email,
            name=clean_name,
            ticket_id=tid,
            category=clean_cat,
            subject=clean_subj,
            message=clean_msg,
            priority=clean_priority,
        )
        email_delivered = ok
        logger.info("Support email for ticket %s sent result: %s (%s)", tid, ok, detail)
    except Exception as exc:
        logger.warning("Support email trigger exception for ticket %s: %s", tid, exc)

    return {
        "ticket_id": tid,
        "msg": "Support request received successfully.",
        "status": "received",
        "delivered": True,
        "email_delivered": email_delivered,
    }


def list_support_tickets(email: Optional[str] = None) -> List[Dict[str, Any]]:
    """Every ticket, or just those filed from one address."""
    tickets = _read_tickets()
    if email:
        email_clean = email.strip().lower()
        return [t for t in tickets if t.get("email") == email_clean]
    return tickets


# ---------------------------------------------------------------------------
# Admin console
# ---------------------------------------------------------------------------


def list_tickets(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[Dict[str, Any]], int]:
    """Tickets newest first, with the filtered total for pagination."""
    limit = max(1, min(limit, MAX_TICKETS))
    rows = _read_tickets()
    if status:
        rows = [t for t in rows if t.get("status") == status]
    if assigned_to:
        rows = [t for t in rows if t.get("assigned_to") == assigned_to]
    rows.sort(key=lambda t: str(t.get("created_at") or ""), reverse=True)
    return rows[offset:offset + limit], len(rows)


def get_ticket(ticket_id: str) -> Optional[Dict[str, Any]]:
    for t in _read_tickets():
        if t.get("ticket_id") == ticket_id:
            return t
    return None


def list_messages(ticket_id: str) -> List[Dict[str, Any]]:
    return list(_read_messages().get(ticket_id, []))


def list_tickets_for_user(user_id: str, email: str) -> List[Dict[str, Any]]:
    """A user's own tickets, matched on account id or the address they used."""
    email_clean = (email or "").strip().lower()
    rows = [
        t for t in _read_tickets()
        if (user_id and str(t.get("user_id") or "") == str(user_id))
        or (email_clean and str(t.get("email") or "") == email_clean)
    ]
    rows.sort(key=lambda t: str(t.get("created_at") or ""), reverse=True)
    return rows


def _apply(ticket_id: str, changes: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    tickets = _read_tickets()
    updated = None
    for t in tickets:
        if t.get("ticket_id") == ticket_id:
            t.update({**changes, "updated_at": _now()})
            updated = t
            break
    if updated:
        _write_tickets(tickets)
    return updated


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

    updated = _apply(ticket_id, changes) or ticket
    audit_service.record(actor, "ticket.updated", target_id=ticket_id, detail=changes)
    return updated


def add_reply(actor: Dict[str, Any], ticket_id: str, body: str) -> Dict[str, Any]:
    """Store a staff reply.

    Storage is what makes the reply real; the email is a notification, and a
    send failure must never lose it. The caller sends the mail afterwards.
    """
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

    messages = _read_messages()
    messages.setdefault(ticket_id, []).append(message)
    _write_messages(messages)

    # A replied ticket is awaiting the user, not sitting in the open queue.
    _apply(ticket_id, {"status": STATUS_PENDING})
    audit_service.record(actor, "ticket.replied", target_id=ticket_id)
    return message


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

    from app.core.supabase import get_supabase_client, safe_supabase_rows

    sessions: List[Dict[str, Any]] = []
    supabase = get_supabase_client()
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
