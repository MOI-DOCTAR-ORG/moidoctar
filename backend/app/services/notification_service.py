"""Real notification delivery.

Before this, `/user/notifications` only ever returned whatever was baked
into a user's record at signup (one "Welcome to MoiDoctar!" line) — nothing
in the app ever added to it afterwards, and for Supabase-backed accounts it
returned nothing at all, since `notifications` was read off the `users` row
(which has no such column) instead of the dedicated `public.notifications`
table that already existed in schema.sql.

This module is the one place that creates, lists, and updates notifications,
backed by that Supabase table when configured, or by the same local
in-memory user store `auth_service` already uses as its fallback. Callers
(triage_service, medication endpoints, etc.) call `create_notification()`
whenever something actually happens that the user should be told about.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.supabase import get_supabase_client, safe_supabase_rows
from app.services.auth_service import find_local_user_record_by_id

logger = logging.getLogger("moidoctar.notifications")


def _format_notification_out(n: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(n.get("id", "")),
        "message": n.get("message", ""),
        "date": n.get("date") or datetime.now(timezone.utc).isoformat(),
        "read": bool(n.get("read", False)),
    }


def create_notification(user_id: str, message: str) -> Optional[Dict[str, Any]]:
    """Record a real notification for `user_id`. Best-effort: a failure here
    (e.g. Supabase hiccup) should never break the event that triggered it
    (a triage assessment, a saved medication, etc.), so this never raises —
    it logs and returns None instead."""
    if not user_id or not message:
        return None

    now_iso = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())
    supabase = get_supabase_client()

    if supabase:
        try:
            record = {"id": new_id, "user_id": str(user_id), "message": message, "date": now_iso, "read": False}
            supabase.table("notifications").insert(record).execute()
            return _format_notification_out(record)
        except Exception as e:
            logger.debug(f"Could not insert notification into Supabase, falling back to local: {e}")

    user = find_local_user_record_by_id(user_id)
    if user is None:
        logger.debug(f"create_notification: no local user found for id {user_id}")
        return None
    entry = {"id": new_id, "message": message, "date": now_iso, "read": False}
    user.setdefault("notifications", [])
    user["notifications"].insert(0, entry)
    return _format_notification_out(entry)


def list_notifications(user_id: str, limit: int = 30) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = (
                supabase.table("notifications")
                .select("*")
                .eq("user_id", str(user_id))
                .order("date", desc=True)
                .limit(limit)
                .execute()
            )
            rows = safe_supabase_rows(res)
            return [_format_notification_out(r) for r in rows]
        except Exception as e:
            logger.debug(f"Could not list notifications from Supabase, falling back to local: {e}")

    user = find_local_user_record_by_id(user_id)
    if user is None:
        return []
    return [_format_notification_out(n) for n in (user.get("notifications") or [])[:limit]]


def mark_all_read(user_id: str) -> None:
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("notifications").update({"read": True}).eq("user_id", str(user_id)).execute()
            return
        except Exception as e:
            logger.debug(f"Could not mark notifications read in Supabase, falling back to local: {e}")

    user = find_local_user_record_by_id(user_id)
    if user is None:
        return
    for n in user.get("notifications") or []:
        n["read"] = True


def dismiss_notification(user_id: str, notification_id: str) -> None:
    supabase = get_supabase_client()
    if supabase:
        try:
            supabase.table("notifications").delete().eq("id", notification_id).eq("user_id", str(user_id)).execute()
            return
        except Exception as e:
            logger.debug(f"Could not delete notification in Supabase, falling back to local: {e}")

    user = find_local_user_record_by_id(user_id)
    if user is None:
        return
    user["notifications"] = [n for n in (user.get("notifications") or []) if str(n.get("id")) != str(notification_id)]
