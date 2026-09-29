"""Append-only record of privileged actions.

Every role change, blacklist, cache clear, AI key change and every read of a
user's consented medical history lands here. For a health product the point is
being able to show what staff did, not merely to believe it went well.

Writes must never break the action they record: a failed audit write is logged
and swallowed. The one exception is reading history, where the caller writes
the audit entry *before* returning data, so a storage outage cannot produce an
unrecorded read.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.supabase import get_supabase_client, safe_supabase_rows

logger = logging.getLogger("moidoctar.audit")

TABLE = "admin_audit"

# Newest first, capped so a long-lived process cannot grow without bound.
_local_audit: List[Dict[str, Any]] = []
_LOCAL_MAX = 500


def record(
    actor: Dict[str, Any],
    action: str,
    target_id: Optional[str] = None,
    detail: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Write one audit entry. Never raises."""
    entry = {
        "id": str(uuid.uuid4()),
        "actor_id": str(actor.get("_id") or actor.get("id") or ""),
        "actor_email": str(actor.get("email") or ""),
        "action": action,
        "target_id": str(target_id) if target_id else None,
        "detail": detail or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table(TABLE).insert(entry).execute()
            return entry
        except Exception as e:
            logger.error("Audit write failed for %s: %s", action, e)

    _local_audit.insert(0, entry)
    del _local_audit[_LOCAL_MAX:]
    return entry


def list_entries(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """Recent entries, newest first."""
    limit = max(1, min(limit, 200))
    supabase = get_supabase_client()
    if supabase:
        try:
            res = (
                supabase.table(TABLE)
                .select("*")
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            return safe_supabase_rows(res)
        except Exception as e:
            logger.error("Audit read failed: %s", e)

    return _local_audit[offset:offset + limit]
