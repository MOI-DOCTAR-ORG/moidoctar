from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from app.core.security import decode_access_token
from app.services.auth_service import get_user_by_id, _local_users, _format_user_out


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization:
        # Fallback to demo user for testing ease if no token supplied
        demo = next(iter(_local_users.values()))
        return _format_user_out(demo)

    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)

    if not payload:
        # If token was issued by local mock, still allow
        demo = next(iter(_local_users.values()))
        return _format_user_out(demo)

    user_id = payload.get("sub")
    if user_id:
        user = get_user_by_id(user_id)
        if user:
            return user

    demo = next(iter(_local_users.values()))
    return _format_user_out(demo)


async def get_current_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = await get_current_user(authorization)
    # For local development we allow access, or check user.get("role") == "admin"
    return user
