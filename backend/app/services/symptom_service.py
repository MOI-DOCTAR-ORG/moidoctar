import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.core.supabase import get_supabase_client

_local_symptoms: List[Dict[str, Any]] = []


def get_user_symptoms(user_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase:
        res = supabase.table("symptoms").select("*").eq("user_id", user_id).order("logged_at", desc=True).execute()
        return res.data or []

    return [s for s in _local_symptoms if s.get("user_id") == user_id or True]


def log_symptom(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())

    record = {
        "id": new_id,
        "user_id": user_id,
        "symptom_name": data.get("symptom_name") or data.get("name") or "Reported Symptom",
        "severity": data.get("severity", "Moderate"),
        "notes": data.get("notes", ""),
        "data": data,
        "logged_at": now_iso,
    }

    if supabase:
        supabase.table("symptoms").insert(record).execute()
        return record

    _local_symptoms.insert(0, record)
    return record
