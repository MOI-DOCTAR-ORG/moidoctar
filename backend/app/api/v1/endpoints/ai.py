"""AI settings: user memory/preferences and admin-managed API key pool."""
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.api.deps import get_current_admin, get_current_user
from app.services import ai_keys, ai_memory
from app.services.gemini_client import test_key

router = APIRouter()


def _uid(user: Dict[str, Any]) -> str:
    return str(user.get("_id") or user.get("id") or "user")


# ---------- status ----------
@router.get("/status")
def ai_status(user: Dict[str, Any] = Depends(get_current_user)):
    view = ai_keys.public_view()
    active = [k for k in view if k["enabled"] and k["status"] not in ("invalid", "cooling_down")]
    return {"ai_enabled": bool(active), "keys_total": len(view), "keys_active": len(active)}


# ---------- user memory ----------
class PreferencesIn(BaseModel):
    response_style: Optional[str] = None
    tone: Optional[str] = None
    units: Optional[str] = None
    language: Optional[str] = None
    emergency_number: Optional[str] = None
    remember_conversations: Optional[bool] = None


class HealthContextIn(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    conditions: Optional[list] = None
    allergies: Optional[list] = None
    medications: Optional[list] = None


@router.get("/memory")
def get_memory(user: Dict[str, Any] = Depends(get_current_user)):
    return ai_memory.load(_uid(user))


@router.put("/preferences")
def put_preferences(body: PreferencesIn, user: Dict[str, Any] = Depends(get_current_user)):
    return ai_memory.set_preferences(_uid(user), body.model_dump(exclude_none=True), source="user")


@router.put("/health-context")
def put_health_context(body: HealthContextIn, user: Dict[str, Any] = Depends(get_current_user)):
    return ai_memory.sync_health_context(_uid(user), body.model_dump(exclude_none=True), source="user")


@router.delete("/memory/facts/{fact_id}")
def delete_fact(fact_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    if not ai_memory.delete_fact(_uid(user), fact_id):
        raise HTTPException(404, detail={"err": "not_found", "msg": "That memory no longer exists."})
    return ai_memory.load(_uid(user))


@router.delete("/memory")
def reset_memory(user: Dict[str, Any] = Depends(get_current_user)):
    ai_memory.reset(_uid(user))
    return ai_memory.load(_uid(user))


# ---------- admin: API key pool ----------
class KeyIn(BaseModel):
    key: str
    label: str = ""
    model: str = ""


class KeyPatch(BaseModel):
    label: Optional[str] = None
    model: Optional[str] = None
    enabled: Optional[bool] = None


@router.get("/keys")
def list_keys(admin: Dict[str, Any] = Depends(get_current_admin)):
    return {"keys": ai_keys.public_view()}


@router.post("/keys")
async def add_key(body: KeyIn, admin: Dict[str, Any] = Depends(get_current_admin)):
    try:
        item = ai_keys.add_key(body.key, body.label, body.model)
    except ValueError as exc:
        raise HTTPException(400, detail={"err": "invalid_key", "msg": str(exc)})
    check = await run_in_threadpool(test_key, item["id"])
    return {"keys": ai_keys.public_view(), "added_id": item["id"], "test": check}


@router.patch("/keys/{key_id}")
def patch_key(key_id: str, body: KeyPatch, admin: Dict[str, Any] = Depends(get_current_admin)):
    if ai_keys.get_key(key_id) and key_id.startswith("env_"):
        raise HTTPException(400, detail={"err": "read_only", "msg": "Keys from environment variables can only be changed in your host settings."})
    if not ai_keys.update_key(key_id, **body.model_dump(exclude_none=True)):
        raise HTTPException(404, detail={"err": "not_found", "msg": "Key not found."})
    return {"keys": ai_keys.public_view()}


@router.delete("/keys/{key_id}")
def remove_key(key_id: str, admin: Dict[str, Any] = Depends(get_current_admin)):
    if key_id.startswith("env_"):
        raise HTTPException(400, detail={"err": "read_only", "msg": "Keys from environment variables can only be removed in your host settings."})
    if not ai_keys.delete_key(key_id):
        raise HTTPException(404, detail={"err": "not_found", "msg": "Key not found."})
    return {"keys": ai_keys.public_view()}


@router.post("/keys/{key_id}/test")
async def check_key(key_id: str, admin: Dict[str, Any] = Depends(get_current_admin)):
    if not ai_keys.get_key(key_id):
        raise HTTPException(404, detail={"err": "not_found", "msg": "Key not found."})
    ai_keys.reset_cooldown(key_id)
    result = await run_in_threadpool(test_key, key_id)
    return {"keys": ai_keys.public_view(), "test": result}
