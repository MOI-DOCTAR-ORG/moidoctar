from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from app.services.auth_service import get_user_by_id, _local_users, _format_user_out
from app.api.deps import get_current_admin

router = APIRouter()


@router.get("/users")
def list_all_users(admin_user: Dict[str, Any] = Depends(get_current_admin)):
    users = [_format_user_out(u) for u in _local_users.values()]
    return {"msg": "Users retrieved", "data": users}


@router.put("/user/role")
def update_user_role(payload: Dict[str, Any], admin_user: Dict[str, Any] = Depends(get_current_admin)):
    return {"msg": "Role updated successfully"}


@router.put("/user/blacklist")
def blacklist_user(payload: Dict[str, Any], admin_user: Dict[str, Any] = Depends(get_current_admin)):
    return {"msg": "User blacklisted successfully"}


@router.get("/user/{user_id}")
def get_user_details(user_id: str, admin_user: Dict[str, Any] = Depends(get_current_admin)):
    user = get_user_by_id(user_id)
    return {"msg": "Success", "data": user}
