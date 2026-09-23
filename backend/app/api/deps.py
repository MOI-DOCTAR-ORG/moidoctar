from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from app.core.security import decode_access_token
from app.services.auth_service import get_user_by_id


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Resolve the authenticated user from the Authorization header.

    Raises 401 whenever no valid, non-expired token is supplied instead of
    silently substituting a demo account - protected routes must actually
    be protected.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"err": "not_authenticated", "msg": "Missing or invalid authentication token"},
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not authorization:
        raise credentials_exception

    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = get_user_by_id(user_id)
    if not user:
        raise credentials_exception

    return user


async def get_optional_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Resolve user if Authorization header is valid, otherwise return None without raising."""
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return get_user_by_id(user_id)


async def get_current_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = await get_current_user(authorization)
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"err": "not_authorized", "msg": "Admin privileges are required for this action"},
        )
    return user
