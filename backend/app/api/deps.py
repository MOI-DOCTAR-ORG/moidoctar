from typing import Callable, Optional, Dict, Any
from fastapi import Depends, Header, HTTPException, status
from app.core.security import decode_access_token
from app.core.permissions import (
    P_ADMIN_ACCESS,
    can,
    effective_role,
    is_operator,
)
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


def _forbidden(msg: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={"err": "not_authorized", "msg": msg},
    )


async def get_current_admin(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Full-control operator. Staff do not pass this check."""
    user = await get_current_user(authorization)
    if effective_role(user) != "admin":
        raise _forbidden("Admin privileges are required for this action")
    return user


async def get_current_operator(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Anyone who may reach the admin console - staff or admin."""
    user = await get_current_user(authorization)
    if not is_operator(user):
        raise _forbidden("Staff privileges are required for this action")
    return user


def require(permission: str) -> Callable:
    """Dependency factory: the route declares what it needs, not who may do it.

    Usage:
        @router.post("/tickets/{id}/reply")
        def reply(user: Dict[str, Any] = Depends(require(P_TICKETS_REPLY))):
    """

    async def _dependency(
        user: Dict[str, Any] = Depends(get_current_user),
    ) -> Dict[str, Any]:
        if not can(user, permission):
            raise _forbidden(f"This action requires the {permission} permission")
        return user

    return _dependency


# Kept so the admin console can reach the same check the frontend mirrors.
__all__ = [
    "get_current_user",
    "get_optional_current_user",
    "get_current_admin",
    "get_current_operator",
    "require",
    "P_ADMIN_ACCESS",
]
