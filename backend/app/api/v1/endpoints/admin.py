from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from app.services.auth_service import get_user_by_id, _local_users, _format_user_out
from app.api.deps import get_current_admin
from app.core.supabase import get_supabase_client

router = APIRouter()


@router.get("/users")
def list_all_users(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("users").select("*").execute()
            if res.data:
                return {"msg": "Users retrieved", "data": [_format_user_out(u) for u in res.data]}
        except Exception:
            pass

    users = [_format_user_out(u) for u in _local_users.values()]
    return {"msg": "Users retrieved", "data": users}


@router.put("/user/role")
def update_user_role(payload: Dict[str, Any], admin_user: Dict[str, Any] = Depends(get_current_admin)):
    target_email = (payload.get("email") or "").strip().lower()
    user_id = payload.get("user_id")
    new_role = payload.get("role", "user")

    if new_role not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")

    supabase = get_supabase_client()
    if supabase and (user_id or target_email):
        try:
            query = supabase.table("users").update({"role": new_role})
            if user_id:
                query = query.eq("id", user_id)
            else:
                query = query.eq("email", target_email)
            query.execute()
        except Exception:
            pass

    for email, u in _local_users.items():
        if (target_email and email == target_email) or (user_id and str(u.get("id")) == str(user_id)):
            u["role"] = new_role
            break

    return {"msg": f"Role updated to {new_role} successfully"}


@router.put("/user/blacklist")
def blacklist_user(payload: Dict[str, Any], admin_user: Dict[str, Any] = Depends(get_current_admin)):
    target_email = (payload.get("email") or "").strip().lower()
    user_id = payload.get("user_id")

    supabase = get_supabase_client()
    if supabase and (user_id or target_email):
        try:
            query = supabase.table("users").update({"is_blacklisted": True})
            if user_id:
                query = query.eq("id", user_id)
            else:
                query = query.eq("email", target_email)
            query.execute()
        except Exception:
            pass

    for email, u in _local_users.items():
        if (target_email and email == target_email) or (user_id and str(u.get("id")) == str(user_id)):
            u["is_blacklisted"] = True
            break

    return {"msg": "User restricted successfully"}


@router.get("/user/{user_id}")
def get_user_details(user_id: str, admin_user: Dict[str, Any] = Depends(get_current_admin)):
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"msg": "Success", "data": _format_user_out(user)}
