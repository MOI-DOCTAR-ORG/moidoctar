"""Role and permission definitions.

Routes declare the permission they need, not the role they expect. A role is
just a named bundle of permissions, so adding a capability means editing one
table here rather than hunting down every `role == "admin"` comparison.

The frontend mirrors this table in src/lib/permissions.ts. Both sides must
change together, and the frontend copy is a convenience only - the server is
the authority on every check.
"""
from typing import Any, Dict, FrozenSet

ROLE_USER = "user"
ROLE_STAFF = "staff"
ROLE_ADMIN = "admin"

VALID_ROLES = (ROLE_USER, ROLE_STAFF, ROLE_ADMIN)

# Roles that may reach the admin console at all.
OPERATOR_ROLES = (ROLE_STAFF, ROLE_ADMIN)

# Reaching the console; every page still checks its own permission.
P_ADMIN_ACCESS = "admin:access"

P_TICKETS_READ = "tickets:read"
P_TICKETS_REPLY = "tickets:reply"
P_TICKETS_ASSIGN = "tickets:assign"
# Consent-gated at the point of use: this permission says the role may ask,
# not that the answer is yes. See support_service.get_ticket_history.
P_TICKETS_VIEW_HISTORY = "tickets:view_history"

P_USERS_READ = "users:read"
P_USERS_BLACKLIST = "users:blacklist"
P_STAFF_MANAGE = "staff:manage"
P_AI_KEYS = "ai:keys"
P_CACHE_CLEAR = "cache:clear"
P_AUDIT_READ = "audit:read"

_STAFF_PERMISSIONS: FrozenSet[str] = frozenset({
    P_ADMIN_ACCESS,
    P_TICKETS_READ,
    P_TICKETS_REPLY,
    P_TICKETS_ASSIGN,
    P_TICKETS_VIEW_HISTORY,
    P_USERS_READ,
})

_ADMIN_PERMISSIONS: FrozenSet[str] = _STAFF_PERMISSIONS | frozenset({
    P_USERS_BLACKLIST,
    P_STAFF_MANAGE,
    P_AI_KEYS,
    P_CACHE_CLEAR,
    P_AUDIT_READ,
})

ROLE_PERMISSIONS: Dict[str, FrozenSet[str]] = {
    ROLE_USER: frozenset(),
    ROLE_STAFF: _STAFF_PERMISSIONS,
    ROLE_ADMIN: _ADMIN_PERMISSIONS,
}


def normalize_role(value: Any) -> str:
    """Any stored role value as one of VALID_ROLES, defaulting to user.

    Unknown values collapse to `user` rather than raising: a typo in the
    database should cost someone their access, never grant it.
    """
    role = str(value or "").strip().lower()
    return role if role in VALID_ROLES else ROLE_USER


def effective_role(user: Dict[str, Any]) -> str:
    """The user's role, with the ADMIN_EMAILS bootstrap applied.

    ADMIN_EMAILS is the break-glass path: it is how the first admin exists at
    all, and how an admin is restored if the last one is ever demoted.
    """
    from app.core.config import settings

    email = str(user.get("email") or "").strip().lower()
    if email and email in settings.admin_emails_list:
        return ROLE_ADMIN
    return normalize_role(user.get("role"))


def permissions_for(role: str) -> FrozenSet[str]:
    return ROLE_PERMISSIONS.get(normalize_role(role), frozenset())


def can(user: Dict[str, Any], permission: str) -> bool:
    """Whether this user holds `permission`."""
    if not isinstance(user, dict):
        return False
    return permission in permissions_for(effective_role(user))


def is_operator(user: Dict[str, Any]) -> bool:
    """Whether this user can reach the admin console at all."""
    return can(user, P_ADMIN_ACCESS)
