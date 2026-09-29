"""Policy for privileged user management.

The guards live here rather than in the route handlers so they hold no matter
which caller reaches them. Three rules prevent an organisation locking itself
out of its own console:

  1. An admin cannot demote themselves.
  2. The last stored admin cannot be demoted or blacklisted.
  3. ADMIN_EMAILS remains the recovery path if 1 and 2 are ever circumvented.

Every write here is audited.
"""
import logging
from typing import Any, Dict, List

from app.core.permissions import (
    ROLE_ADMIN,
    ROLE_STAFF,
    ROLE_USER,
    VALID_ROLES,
    normalize_role,
)
from app.services import audit_service
from app.services.auth_service import (
    count_users_with_role,
    get_user_by_id,
    list_all_users,
    set_user_blacklisted,
    set_user_role,
)

logger = logging.getLogger("moidoctar.admin")


class AdminActionError(Exception):
    """A refused admin action. `code` is stable for the frontend to switch on."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


def _actor_id(actor: Dict[str, Any]) -> str:
    return str(actor.get("_id") or actor.get("id") or "")


def list_users(limit: int = 200, offset: int = 0) -> List[Dict[str, Any]]:
    return list_all_users(limit=limit, offset=offset)


def list_operators() -> List[Dict[str, Any]]:
    """Everyone who can reach the console, admins first."""
    everyone = list_all_users(limit=500)
    operators = [u for u in everyone if normalize_role(u.get("role")) in (ROLE_STAFF, ROLE_ADMIN)]
    operators.sort(key=lambda u: (normalize_role(u.get("role")) != ROLE_ADMIN, str(u.get("userName") or "")))
    return operators


def _guard_role_change(actor: Dict[str, Any], target: Dict[str, Any], new_role: str) -> None:
    target_role = normalize_role(target.get("role"))

    if target_role == new_role:
        return

    # Rule 1: no self-demotion. Losing your own access by accident is the one
    # mistake that cannot be undone from inside the console.
    if _actor_id(actor) == str(target.get("_id") or "") and new_role != ROLE_ADMIN:
        raise AdminActionError(
            "cannot_demote_self",
            "You cannot change your own role. Ask another admin to do it.",
        )

    # Rule 2: never remove the last admin.
    if target_role == ROLE_ADMIN and new_role != ROLE_ADMIN:
        if count_users_with_role(ROLE_ADMIN) <= 1:
            raise AdminActionError(
                "last_admin",
                "This is the only remaining admin. Promote another admin first.",
            )


def change_user_role(actor: Dict[str, Any], user_id: str, new_role: str) -> Dict[str, Any]:
    """Set a user's role, refusing changes that would lock the team out."""
    role = str(new_role or "").strip().lower()
    if role not in VALID_ROLES:
        raise AdminActionError(
            "invalid_role",
            f"Role must be one of: {', '.join(VALID_ROLES)}.",
        )

    target = get_user_by_id(user_id)
    if not target:
        raise AdminActionError("user_not_found", "No user with that id.")

    previous = normalize_role(target.get("role"))
    _guard_role_change(actor, target, role)

    updated = set_user_role(user_id, role)
    audit_service.record(
        actor,
        "user.role_changed",
        target_id=user_id,
        detail={"from": previous, "to": role, "target_email": target.get("email")},
    )
    return updated


def set_blacklist(actor: Dict[str, Any], user_id: str, blacklisted: bool) -> Dict[str, Any]:
    """Block or restore an account."""
    target = get_user_by_id(user_id)
    if not target:
        raise AdminActionError("user_not_found", "No user with that id.")

    if blacklisted:
        if _actor_id(actor) == str(target.get("_id") or ""):
            raise AdminActionError(
                "cannot_blacklist_self",
                "You cannot blacklist your own account.",
            )
        if normalize_role(target.get("role")) == ROLE_ADMIN and count_users_with_role(ROLE_ADMIN) <= 1:
            raise AdminActionError(
                "last_admin",
                "This is the only remaining admin. Promote another admin first.",
            )

    updated = set_user_blacklisted(user_id, blacklisted)
    audit_service.record(
        actor,
        "user.blacklisted" if blacklisted else "user.unblacklisted",
        target_id=user_id,
        detail={"target_email": target.get("email")},
    )
    return updated


def add_staff(actor: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    return change_user_role(actor, user_id, ROLE_STAFF)


def remove_staff(actor: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """Demote an operator back to a normal user."""
    return change_user_role(actor, user_id, ROLE_USER)
