"""Lockout guards: an admin must not be able to remove the team's last way in."""
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "ai"))
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from app.services import admin_service  # noqa: E402
from app.services.admin_service import AdminActionError  # noqa: E402


@pytest.fixture
def fake_store(monkeypatch):
    """Two admins and one plain user, with writes captured rather than stored."""
    users = {
        "a1": {"_id": "a1", "email": "one@x.com", "userName": "One", "role": "admin"},
        "a2": {"_id": "a2", "email": "two@x.com", "userName": "Two", "role": "admin"},
        "u1": {"_id": "u1", "email": "user@x.com", "userName": "Reg", "role": "user"},
    }
    writes = []

    def _get(uid):
        return users.get(uid)

    def _count(role):
        return sum(1 for u in users.values() if u["role"] == role)

    def _set_role(uid, role):
        writes.append((uid, role))
        users[uid]["role"] = role
        return users[uid]

    def _set_black(uid, flag):
        writes.append((uid, f"blacklist={flag}"))
        return users[uid]

    monkeypatch.setattr(admin_service, "get_user_by_id", _get)
    monkeypatch.setattr(admin_service, "count_users_with_role", _count)
    monkeypatch.setattr(admin_service, "set_user_role", _set_role)
    monkeypatch.setattr(admin_service, "set_user_blacklisted", _set_black)
    monkeypatch.setattr(admin_service.audit_service, "record", lambda *a, **k: None)
    return users, writes


def test_admin_cannot_demote_themselves(fake_store):
    users, writes = fake_store
    with pytest.raises(AdminActionError) as e:
        admin_service.change_user_role(users["a1"], "a1", "user")
    assert e.value.code == "cannot_demote_self"
    assert writes == []


def test_last_admin_cannot_be_demoted(fake_store):
    users, writes = fake_store
    users["a2"]["role"] = "user"  # a1 is now the only admin
    with pytest.raises(AdminActionError) as e:
        admin_service.change_user_role(users["a2"], "a1", "staff")
    assert e.value.code == "last_admin"
    assert writes == []


def test_admin_can_be_demoted_while_another_admin_remains(fake_store):
    users, writes = fake_store
    admin_service.change_user_role(users["a1"], "a2", "staff")
    assert ("a2", "staff") in writes
    assert users["a2"]["role"] == "staff"


def test_invalid_role_is_refused_before_any_write(fake_store):
    users, writes = fake_store
    with pytest.raises(AdminActionError) as e:
        admin_service.change_user_role(users["a1"], "u1", "superuser")
    assert e.value.code == "invalid_role"
    assert writes == []


def test_missing_user_is_refused(fake_store):
    users, writes = fake_store
    with pytest.raises(AdminActionError) as e:
        admin_service.change_user_role(users["a1"], "nope", "staff")
    assert e.value.code == "user_not_found"
    assert writes == []


def test_admin_cannot_blacklist_themselves(fake_store):
    users, writes = fake_store
    with pytest.raises(AdminActionError) as e:
        admin_service.set_blacklist(users["a1"], "a1", True)
    assert e.value.code == "cannot_blacklist_self"
    assert writes == []


def test_last_admin_cannot_be_blacklisted(fake_store):
    users, writes = fake_store
    users["a2"]["role"] = "user"
    with pytest.raises(AdminActionError) as e:
        admin_service.set_blacklist(users["a2"], "a1", True)
    assert e.value.code == "last_admin"
    assert writes == []


def test_promoting_a_user_to_staff_writes(fake_store):
    users, writes = fake_store
    admin_service.add_staff(users["a1"], "u1")
    assert ("u1", "staff") in writes


def test_unblacklisting_is_never_guarded(fake_store):
    """Restoring access is always safe, even for the last admin."""
    users, writes = fake_store
    users["a2"]["role"] = "user"
    admin_service.set_blacklist(users["a2"], "a1", False)
    assert ("a1", "blacklist=False") in writes
