"""Role and permission rules: staff are limited, admins are not, users get nothing."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "ai"))
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from app.core.permissions import (  # noqa: E402
    P_ADMIN_ACCESS,
    P_AI_KEYS,
    P_CACHE_CLEAR,
    P_STAFF_MANAGE,
    P_TICKETS_READ,
    P_TICKETS_REPLY,
    P_USERS_BLACKLIST,
    P_USERS_READ,
    ROLE_ADMIN,
    ROLE_STAFF,
    ROLE_USER,
    can,
    effective_role,
    is_operator,
    normalize_role,
)


def _user(role="user", email="someone@example.com"):
    return {"_id": "1", "email": email, "role": role}


def test_plain_user_has_no_operator_permissions():
    u = _user(ROLE_USER)
    assert not is_operator(u)
    for p in (P_ADMIN_ACCESS, P_TICKETS_READ, P_USERS_READ, P_STAFF_MANAGE):
        assert not can(u, p)


def test_staff_can_work_tickets_but_not_manage_staff_or_keys():
    u = _user(ROLE_STAFF)
    assert is_operator(u)
    assert can(u, P_TICKETS_READ)
    assert can(u, P_TICKETS_REPLY)
    assert can(u, P_USERS_READ)
    # The limits that make staff a limited tier at all.
    assert not can(u, P_STAFF_MANAGE)
    assert not can(u, P_USERS_BLACKLIST)
    assert not can(u, P_AI_KEYS)
    assert not can(u, P_CACHE_CLEAR)


def test_admin_holds_every_staff_permission_and_more():
    admin, staff = _user(ROLE_ADMIN), _user(ROLE_STAFF)
    for p in (P_ADMIN_ACCESS, P_TICKETS_READ, P_TICKETS_REPLY, P_USERS_READ):
        assert can(staff, p) and can(admin, p)
    for p in (P_STAFF_MANAGE, P_USERS_BLACKLIST, P_AI_KEYS, P_CACHE_CLEAR):
        assert can(admin, p)


def test_unknown_role_collapses_to_user_not_to_access():
    """A typo in the database must cost access, never grant it."""
    for bad in ("administrator", "ADMIN ", "superuser", "", None, 42):
        assert normalize_role(bad) in (ROLE_USER, ROLE_ADMIN)
    assert normalize_role("superuser") == ROLE_USER
    assert not can(_user("superuser"), P_ADMIN_ACCESS)


def test_role_matching_is_case_insensitive():
    assert normalize_role("Admin") == ROLE_ADMIN
    assert normalize_role(" STAFF ") == ROLE_STAFF


def test_admin_emails_bootstrap_promotes_regardless_of_stored_role(monkeypatch):
    from app.core import config

    monkeypatch.setattr(
        type(config.settings), "admin_emails_list",
        property(lambda self: ["boss@moidoctar.com"]),
    )
    stored_as_plain_user = _user(ROLE_USER, email="boss@moidoctar.com")
    assert effective_role(stored_as_plain_user) == ROLE_ADMIN
    assert can(stored_as_plain_user, P_STAFF_MANAGE)


def test_can_rejects_non_dict_input():
    assert not can(None, P_ADMIN_ACCESS)
    assert not can("admin", P_ADMIN_ACCESS)
