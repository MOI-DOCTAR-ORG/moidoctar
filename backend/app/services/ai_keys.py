"""Pool of Gemini API keys with rotation, cooldowns and admin management.

Keys come from two places and are merged:
  * environment: GOOGLE_API_KEY and/or GOOGLE_API_KEYS (comma / newline / space separated)
  * runtime: keys an admin adds through the app (persisted via kv_store)

Selection is round-robin across enabled keys that are not cooling down. When a
key is rate limited (429) it sleeps for a while; when it is rejected as invalid
(400/401/403) it is parked for a long time until an admin re-tests it.
"""
import re
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.services.kv_store import kv_get, kv_set

_STORE_NAME = "ai_keys"
_lock = threading.RLock()
_cursor = 0
# Runtime-only state (not persisted): cooldowns and counters for env keys too.
_runtime: Dict[str, Dict[str, Any]] = {}

RATE_LIMIT_COOLDOWN = 60
QUOTA_COOLDOWN = 60 * 60
INVALID_COOLDOWN = 60 * 60 * 24


def _now() -> float:
    return time.time()


def _iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _split_env(raw: str) -> List[str]:
    return [k for k in re.split(r"[\s,;]+", raw or "") if k]


def _env_keys() -> List[Dict[str, Any]]:
    seen, out = set(), []
    for raw in (settings.GOOGLE_API_KEY, settings.GOOGLE_API_KEYS):
        for key in _split_env(raw):
            if key in seen:
                continue
            seen.add(key)
            out.append({
                "id": "env_" + str(len(out) + 1),
                "label": f"Environment key {len(out) + 1}",
                "key": key,
                "model": "",
                "enabled": True,
                "source": "env",
                "added_at": None,
            })
    return out


def _stored_keys() -> List[Dict[str, Any]]:
    data = kv_get(_STORE_NAME, [])
    return data if isinstance(data, list) else []


def _save_stored(items: List[Dict[str, Any]]) -> None:
    kv_set(_STORE_NAME, items)


def all_keys() -> List[Dict[str, Any]]:
    stored = [dict(k, source="admin") for k in _stored_keys() if k.get("key")]
    env = _env_keys()
    known = {k["key"] for k in stored}
    return stored + [k for k in env if k["key"] not in known]


def mask(key: str) -> str:
    if len(key) <= 10:
        return "•" * len(key)
    return f"{key[:4]}…{key[-4:]}"


def _state(key_id: str) -> Dict[str, Any]:
    return _runtime.setdefault(key_id, {"uses": 0, "failures": 0, "cooldown_until": 0.0, "last_error": "", "last_used": None, "status": "unknown"})


def public_view() -> List[Dict[str, Any]]:
    out = []
    for k in all_keys():
        st = _state(k["id"])
        cooling = st["cooldown_until"] > _now()
        out.append({
            "id": k["id"],
            "label": k.get("label") or "Untitled key",
            "masked": mask(k["key"]),
            "model": k.get("model") or "",
            "enabled": bool(k.get("enabled", True)),
            "source": k.get("source", "admin"),
            "added_at": k.get("added_at"),
            "uses": st["uses"],
            "failures": st["failures"],
            "last_used": st["last_used"],
            "last_error": st["last_error"],
            "status": "cooling_down" if cooling else st["status"],
            "cooldown_seconds": max(0, int(st["cooldown_until"] - _now())) if cooling else 0,
        })
    return out


def usable_keys() -> List[Dict[str, Any]]:
    """Enabled keys not cooling down, rotated so each call starts on the next key."""
    global _cursor
    with _lock:
        keys = [k for k in all_keys() if k.get("enabled", True) and _state(k["id"])["cooldown_until"] <= _now()]
        if not keys:
            return []
        start = _cursor % len(keys)
        _cursor += 1
        return keys[start:] + keys[:start]


def has_any_key() -> bool:
    return any(k.get("enabled", True) for k in all_keys())


def report_success(key_id: str) -> None:
    with _lock:
        st = _state(key_id)
        st["uses"] += 1
        st["last_used"] = _iso()
        st["status"] = "ok"
        st["last_error"] = ""


def report_failure(key_id: str, http_status: Optional[int], detail: str = "") -> None:
    with _lock:
        st = _state(key_id)
        st["failures"] += 1
        st["last_error"] = (detail or f"HTTP {http_status}")[:200]
        if http_status == 429:
            quota = "quota" in detail.lower() or "per day" in detail.lower()
            st["cooldown_until"] = _now() + (QUOTA_COOLDOWN if quota else RATE_LIMIT_COOLDOWN)
            st["status"] = "rate_limited"
        elif http_status in (400, 401, 403):
            # 400 is only a key problem when the message says so
            if http_status != 400 or "api key" in detail.lower():
                st["cooldown_until"] = _now() + INVALID_COOLDOWN
                st["status"] = "invalid"
        else:
            st["cooldown_until"] = _now() + 10
            st["status"] = "error"


def add_key(key: str, label: str = "", model: str = "") -> Dict[str, Any]:
    key = (key or "").strip()
    if not re.fullmatch(r"[A-Za-z0-9_\-]{20,}", key):
        raise ValueError("That doesn't look like a valid API key.")
    with _lock:
        if any(k["key"] == key for k in all_keys()):
            raise ValueError("This key has already been added.")
        stored = _stored_keys()
        item = {
            "id": "key_" + uuid.uuid4().hex[:8],
            "label": (label or f"Key {len(all_keys()) + 1}").strip()[:60],
            "key": key,
            "model": (model or "").strip()[:60],
            "enabled": True,
            "added_at": _iso(),
        }
        stored.append(item)
        _save_stored(stored)
        return item


def update_key(key_id: str, **changes: Any) -> bool:
    with _lock:
        stored = _stored_keys()
        for item in stored:
            if item["id"] == key_id:
                for field in ("label", "model", "enabled"):
                    if field in changes and changes[field] is not None:
                        item[field] = changes[field]
                _save_stored(stored)
                if changes.get("enabled"):
                    _state(key_id)["cooldown_until"] = 0.0
                return True
    return False


def delete_key(key_id: str) -> bool:
    with _lock:
        stored = _stored_keys()
        kept = [k for k in stored if k["id"] != key_id]
        if len(kept) == len(stored):
            return False
        _save_stored(kept)
        _runtime.pop(key_id, None)
        return True


def get_key(key_id: str) -> Optional[Dict[str, Any]]:
    return next((k for k in all_keys() if k["id"] == key_id), None)


def reset_cooldown(key_id: str) -> None:
    with _lock:
        st = _state(key_id)
        st["cooldown_until"] = 0.0
        st["status"] = "unknown"
