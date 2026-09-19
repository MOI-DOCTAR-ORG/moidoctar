import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.core.supabase import get_supabase_client

_local_medications: List[Dict[str, Any]] = [
    {
        "id": "med-1",
        "user_id": "usr_demo_001",
        "name": "Lisinopril",
        "dosage": "10mg",
        "time": "8:00 AM",
        "frequent": "morning",
        "supply": "30",
        "status": True,
        "startedAt": "2026-02-01T08:00:00.000Z",
        "stoppedAt": None,
    },
    {
        "id": "med-2",
        "user_id": "usr_demo_001",
        "name": "Metformin",
        "dosage": "500mg",
        "time": "8:00 PM",
        "frequent": "night",
        "supply": "60",
        "status": True,
        "startedAt": "2026-02-15T20:00:00.000Z",
        "stoppedAt": None,
    },
    {
        "id": "med-3",
        "user_id": "usr_demo_001",
        "name": "Vitamin D3",
        "dosage": "2000 IU",
        "time": "9:00 AM",
        "frequent": "morning",
        "supply": "90",
        "status": True,
        "startedAt": "2026-01-10T09:00:00.000Z",
        "stoppedAt": None,
    },
]


def _format_med_out(m: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(m.get("id")),
        "name": m.get("name", ""),
        "dosage": m.get("dosage", ""),
        "time": m.get("time", "08:00 AM"),
        "frequent": m.get("frequent", "morning"),
        "supply": str(m.get("supply", "30")),
        "status": bool(m.get("status", True)),
        "startedAt": m.get("started_at") or m.get("startedAt") or datetime.now(timezone.utc).isoformat(),
        "stoppedAt": m.get("stopped_at") or m.get("stoppedAt"),
    }


def get_user_medications(user_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase:
        res = supabase.table("medications").select("*").eq("user_id", user_id).order("started_at", desc=True).execute()
        return [_format_med_out(m) for m in (res.data or [])]

    # Fallback to local store
    return [_format_med_out(m) for m in _local_medications]


def add_medication(user_id: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    new_id = str(uuid.uuid4())

    if supabase:
        record = {
            "id": new_id,
            "user_id": user_id,
            "name": data.get("name", ""),
            "dosage": data.get("dosage", ""),
            "time": data.get("time", "08:00 AM"),
            "frequent": data.get("frequent", "morning"),
            "supply": str(data.get("supply", "30")),
            "status": True,
            "started_at": now_iso,
        }
        supabase.table("medications").insert(record).execute()
        return get_user_medications(user_id)

    new_med = {
        "id": "med-" + str(uuid.uuid4())[:8],
        "user_id": user_id,
        "name": data.get("name", ""),
        "dosage": data.get("dosage", ""),
        "time": data.get("time", "08:00 AM"),
        "frequent": data.get("frequent", "morning"),
        "supply": str(data.get("supply", "30")),
        "status": True,
        "startedAt": now_iso,
        "stoppedAt": None,
    }
    _local_medications.insert(0, new_med)
    return [_format_med_out(m) for m in _local_medications]


def stop_medication(user_id: str, medication_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    if supabase:
        supabase.table("medications").update({"status": False, "stopped_at": now_iso}).eq("id", medication_id).execute()
        return get_user_medications(user_id)

    for m in _local_medications:
        if str(m.get("id")) == str(medication_id):
            m["status"] = False
            m["stoppedAt"] = now_iso
            break
    return [_format_med_out(m) for m in _local_medications]
