import random
import logging
import datetime
from typing import List, Dict, Any, Optional
from app.services.kv_store import kv_get, kv_set

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

    ticket = {
        "ticket_id": tid,
        "name": name.strip(),
        "email": email.strip().lower(),
        "category": clean_cat,
        "subject": subject.strip(),
        "message": message.strip(),
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

    logger.info("Support ticket created: %s (%s) for %s", tid, clean_cat, email)

    return {
        "ticket_id": tid,
        "msg": "Support request received successfully.",
        "status": "received",
        "delivered": True,
    }

def list_support_tickets(email: Optional[str] = None) -> List[Dict[str, Any]]:
    tickets = kv_get("support_tickets", [])
    if not isinstance(tickets, list):
        return []
    if email:
        email_clean = email.strip().lower()
        return [t for t in tickets if t.get("email") == email_clean]
    return tickets
