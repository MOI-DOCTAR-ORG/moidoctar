"""Per-user AI memory: preferences, health context, learned facts, change log.

Everything the assistant should remember between conversations lives here and
is injected into every prompt. Every change (made by the user in settings,
synced from their profile, or learned by the AI from conversation) is
recorded in a change log so it is visible and reversible.
"""
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.services.kv_store import kv_get, kv_set

_lock = threading.RLock()

PREFERENCE_CHOICES = {
    "response_style": {"concise", "balanced", "detailed"},
    "tone": {"gentle", "direct"},
    "units": {"metric", "imperial"},
}
DEFAULT_PREFERENCES: Dict[str, Any] = {
    "response_style": "balanced",
    "tone": "gentle",
    "units": "metric",
    "language": "English",
    "emergency_number": "112",
    "remember_conversations": True,
}
LIST_FIELDS = ("conditions", "allergies", "medications")
MAX_FACTS = 40
MAX_HISTORY = 120


def _iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _key(user_id: str) -> str:
    return f"ai_memory_{user_id}"


def _blank() -> Dict[str, Any]:
    return {
        "preferences": dict(DEFAULT_PREFERENCES),
        "health_context": {"age": None, "gender": "", "location": "", "conditions": [], "allergies": [], "medications": []},
        "facts": [],
        "history": [],
        "updated_at": None,
    }


def load(user_id: str) -> Dict[str, Any]:
    data = kv_get(_key(user_id), None)
    mem = _blank()
    if isinstance(data, dict):
        mem["preferences"].update({k: v for k, v in (data.get("preferences") or {}).items() if k in DEFAULT_PREFERENCES})
        mem["health_context"].update(data.get("health_context") or {})
        mem["facts"] = data.get("facts") or []
        mem["history"] = data.get("history") or []
        mem["updated_at"] = data.get("updated_at")
    return mem


def _save(user_id: str, mem: Dict[str, Any]) -> None:
    mem["updated_at"] = _iso()
    mem["history"] = mem["history"][-MAX_HISTORY:]
    mem["facts"] = mem["facts"][-MAX_FACTS:]
    kv_set(_key(user_id), mem)


def _log(mem: Dict[str, Any], field: str, old: Any, new: Any, source: str) -> None:
    mem["history"].append({"at": _iso(), "field": field, "from": old, "to": new, "source": source})


def _clean_str(v: Any, limit: int = 80) -> str:
    return " ".join(str(v or "").split())[:limit]


def _clean_list(values: Any, limit: int = 20) -> List[str]:
    out: List[str] = []
    for v in values if isinstance(values, list) else []:
        s = _clean_str(v)
        if s and s.lower() not in {x.lower() for x in out}:
            out.append(s)
    return out[:limit]


def set_preferences(user_id: str, changes: Dict[str, Any], source: str = "user") -> Dict[str, Any]:
    with _lock:
        mem = load(user_id)
        prefs = mem["preferences"]
        for field, value in (changes or {}).items():
            if field not in DEFAULT_PREFERENCES:
                continue
            if field in PREFERENCE_CHOICES:
                value = str(value).lower()
                if value not in PREFERENCE_CHOICES[field]:
                    continue
            elif field == "remember_conversations":
                value = bool(value)
            else:
                value = _clean_str(value, 40)
                if not value:
                    continue
            if prefs.get(field) != value:
                _log(mem, f"preferences.{field}", prefs.get(field), value, source)
                prefs[field] = value
        _save(user_id, mem)
        return mem


def sync_health_context(user_id: str, incoming: Dict[str, Any], source: str = "profile") -> Dict[str, Any]:
    """Merge the health details the app already knows (profile, body map)."""
    with _lock:
        mem = load(user_id)
        ctx = mem["health_context"]
        incoming = incoming or {}
        for field in ("age", "gender", "location"):
            if field not in incoming:
                continue
            value = incoming[field]
            value = value if field == "age" and isinstance(value, int) and 0 < value < 125 else _clean_str(value, 60) if field != "age" else None
            if value not in (None, "") and ctx.get(field) != value:
                _log(mem, f"health.{field}", ctx.get(field), value, source)
                ctx[field] = value
        for field in LIST_FIELDS:
            if field not in incoming:
                continue
            new = _clean_list(incoming[field])
            if new != ctx.get(field):
                _log(mem, f"health.{field}", ctx.get(field), new, source)
                ctx[field] = new
        _save(user_id, mem)
        return mem


def apply_ai_updates(user_id: str, updates: Any) -> List[str]:
    """Store things the AI learned from conversation. Returns human-readable notes."""
    if not isinstance(updates, dict):
        return []
    notes: List[str] = []
    with _lock:
        mem = load(user_id)
        if not mem["preferences"].get("remember_conversations", True):
            return []
        ctx, prefs = mem["health_context"], mem["preferences"]

        for field in ("conditions", "allergies", "medications"):
            for item in _clean_list(updates.get(f"{field}_add")):
                if item.lower() not in {x.lower() for x in ctx[field]}:
                    ctx[field].append(item)
                    _log(mem, f"health.{field}", None, item, "ai")
                    notes.append(f"Noted {field[:-1] if field != 'medications' else 'medication'}: {item}")

        for field, value in (updates.get("preferences") or {}).items():
            if field in DEFAULT_PREFERENCES and field != "remember_conversations":
                value = str(value).lower() if field in PREFERENCE_CHOICES else _clean_str(value, 40)
                valid = value in PREFERENCE_CHOICES[field] if field in PREFERENCE_CHOICES else bool(value)
                if valid and prefs.get(field) != value:
                    _log(mem, f"preferences.{field}", prefs.get(field), value, "ai")
                    prefs[field] = value
                    notes.append(f"Updated preference: {field.replace('_', ' ')} → {value}")

        existing = {f["text"].lower() for f in mem["facts"]}
        for fact in _clean_list(updates.get("facts"), 5):
            if fact.lower() not in existing:
                mem["facts"].append({"id": "f_" + uuid.uuid4().hex[:6], "text": fact, "source": "ai", "created_at": _iso()})
                _log(mem, "fact", None, fact, "ai")
                notes.append(f"Remembered: {fact}")
        if notes:
            _save(user_id, mem)
    return notes


def delete_fact(user_id: str, fact_id: str) -> bool:
    with _lock:
        mem = load(user_id)
        kept = [f for f in mem["facts"] if f["id"] != fact_id]
        if len(kept) == len(mem["facts"]):
            return False
        removed = next(f for f in mem["facts"] if f["id"] == fact_id)
        mem["facts"] = kept
        _log(mem, "fact", removed["text"], None, "user")
        _save(user_id, mem)
        return True


def remove_health_item(user_id: str, field: str, value: str) -> bool:
    if field not in LIST_FIELDS:
        return False
    with _lock:
        mem = load(user_id)
        items = mem["health_context"][field]
        kept = [x for x in items if x.lower() != value.lower()]
        if len(kept) == len(items):
            return False
        mem["health_context"][field] = kept
        _log(mem, f"health.{field}", value, None, "user")
        _save(user_id, mem)
        return True


def reset(user_id: str) -> None:
    with _lock:
        kv_set(_key(user_id), _blank())


def prompt_block(mem: Dict[str, Any], extra: Optional[Dict[str, Any]] = None) -> str:
    """Render memory as text for the system prompt."""
    p, h = mem["preferences"], mem["health_context"]
    lines = [
        "USER PREFERENCES (follow these):",
        f"- Answer length: {p['response_style']} (concise = 1-2 sentences, balanced = 2-4, detailed = a short paragraph)",
        f"- Tone: {p['tone']}",
        f"- Reply in: {p['language']}",
        f"- Units: {p['units']}",
        f"- Local emergency number: {p['emergency_number']}",
        "KNOWN HEALTH CONTEXT (from the user's profile and past chats; may be incomplete):",
        f"- Age: {h.get('age') or 'unknown'}; Gender: {h.get('gender') or 'unknown'}; Location: {h.get('location') or 'unknown'}",
        f"- Conditions: {', '.join(h['conditions']) or 'none recorded'}",
        f"- Allergies: {', '.join(h['allergies']) or 'none recorded'}",
        f"- Current medications: {', '.join(h['medications']) or 'none recorded'}",
    ]
    if mem["facts"]:
        lines.append("THINGS REMEMBERED FROM EARLIER CONVERSATIONS:")
        lines += [f"- {f['text']}" for f in mem["facts"][-15:]]
    extra = extra or {}
    areas = extra.get("body_areas") or []
    if areas:
        lines.append("BODY AREAS THE USER MARKED THIS SESSION:")
        for a in areas[:8]:
            lines.append(f"- {a.get('label', '?')} ({a.get('severity', 'unspecified')}) {a.get('notes', '')}".strip())
    if extra.get("severity"):
        lines.append(f"USER SELF-RATED SEVERITY THIS SESSION: {str(extra['severity'])[:20]}")
    recent = extra.get("recent_sessions") or []
    if recent:
        lines.append("RECENT PREVIOUS ASSESSMENTS:")
        lines += [f"- {r}" for r in recent[:3]]
    return "\n".join(lines)
