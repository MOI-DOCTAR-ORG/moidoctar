import random
import logging
import datetime
from typing import List, Dict, Any, Optional
from app.services.kv_store import kv_get, kv_set
from app.core.email import send_support_ticket_email

logger = logging.getLogger("moidoctar.support")

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

def generate_ticket_id() -> str:
    alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    suffix = ''.join(random.choice(alphabet) for _ in range(6))
    return f"SUP-{suffix}"

def create_support_ticket(
    name: str,
    email: str,
    category: str,
    subject: str,
    message: str,
    priority: str = "normal",
    ticket_id: Optional[str] = None,
) -> Dict[str, Any]:
    tid = ticket_id.strip() if ticket_id and ticket_id.strip() else generate_ticket_id()
    clean_cat = category if category in CATEGORIES else "Something else"
    clean_name = name.strip()
    clean_email = email.strip().lower()
    clean_subj = subject.strip()
    clean_msg = message.strip()

    ticket = {
        "ticket_id": tid,
        "name": clean_name,
        "email": clean_email,
        "category": clean_cat,
        "subject": clean_subj,
        "message": clean_msg,
        "priority": priority,
        "status": "open",
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }

    tickets = kv_get("support_tickets", [])
    if not isinstance(tickets, list):
        tickets = []

    # Replace existing ticket if ticket_id was re-sent from queue
    tickets = [t for t in tickets if t.get("ticket_id") != tid]
    tickets.insert(0, ticket)
    kv_set("support_tickets", tickets[:200])

    logger.info("Support ticket created: %s (%s) for %s", tid, clean_cat, clean_email)

    # Attempt email confirmation sending
    email_delivered = False
    try:
        ok, detail = send_support_ticket_email(
            to_email=clean_email,
            name=clean_name,
            ticket_id=tid,
            category=clean_cat,
            subject=clean_subj,
            message=clean_msg,
            priority=priority,
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
    tickets = kv_get("support_tickets", [])
    if not isinstance(tickets, list):
        return []
    if email:
        email_clean = email.strip().lower()
        return [t for t in tickets if t.get("email") == email_clean]
    return tickets
