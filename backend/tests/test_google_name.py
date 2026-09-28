"""Google sign-in names: a real name from Google initialises the account, but never
overwrites a name the person saved themselves (Google and Supabase are mocked)."""
import io
import json
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "ai"))
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from app.services import auth_service  # noqa: E402

EMAIL = "omotoshokorede1025@gmail.com"


@pytest.fixture(autouse=True)
def _no_supabase(monkeypatch):
    monkeypatch.setattr(auth_service, "get_supabase_client", lambda: None)
    monkeypatch.setattr(auth_service, "_verify_google_id_token", lambda token, token_type="id_token": {"email": EMAIL, "email_verified": "true"})
    auth_service._local_users.pop(EMAIL, None)
    yield
    auth_service._local_users.pop(EMAIL, None)


def _userinfo(monkeypatch, payload):
    calls = []

    def fake_urlopen(req, timeout=10):
        calls.append(req)
        if isinstance(payload, Exception):
            raise payload
        return io.BytesIO(json.dumps(payload).encode())

    monkeypatch.setattr("urllib.request.urlopen", fake_urlopen)
    return calls


def test_new_google_user_gets_real_name_from_userinfo(monkeypatch):
    calls = _userinfo(monkeypatch, {"email": EMAIL, "given_name": "Korede", "family_name": "Omotosho"})
    res = auth_service.authenticate_google("tok", "access_token")
    assert res["user"]["userName"] == "Korede Omotosho"
    assert calls and calls[0].get_header("Authorization") == "Bearer tok"


def test_userinfo_failure_falls_back_to_email_prefix(monkeypatch):
    _userinfo(monkeypatch, OSError("offline"))
    res = auth_service.authenticate_google("tok", "access_token")
    assert res["user"]["userName"] == "omotoshokorede1025"


def test_userinfo_for_a_different_account_is_ignored(monkeypatch):
    _userinfo(monkeypatch, {"email": "someone.else@gmail.com", "name": "Someone Else"})
    res = auth_service.authenticate_google("tok", "access_token")
    assert res["user"]["userName"] == "omotoshokorede1025"


def test_placeholder_name_is_upgraded_on_next_google_login(monkeypatch):
    _userinfo(monkeypatch, OSError("offline"))
    auth_service.authenticate_google("tok", "access_token")
    _userinfo(monkeypatch, {"email": EMAIL, "name": "Korede Omotosho"})
    res = auth_service.authenticate_google("tok", "access_token")
    assert res["user"]["userName"] == "Korede Omotosho"


def test_saved_name_is_not_overwritten_by_google(monkeypatch):
    _userinfo(monkeypatch, {"email": EMAIL, "name": "Korede Omotosho"})
    first = auth_service.authenticate_google("tok", "access_token")
    auth_service.update_user_profile(first["user"]["_id"], {"userName": "Kay Omotosho"})
    res = auth_service.authenticate_google("tok", "access_token")
    assert res["user"]["userName"] == "Kay Omotosho"


def test_id_token_name_claim_is_used_without_extra_request(monkeypatch):
    monkeypatch.setattr(
        auth_service,
        "_verify_google_id_token",
        lambda token, token_type="id_token": {"email": EMAIL, "email_verified": "true", "name": "Korede Omotosho"},
    )
    calls = _userinfo(monkeypatch, {})
    res = auth_service.authenticate_google("tok", "id_token")
    assert res["user"]["userName"] == "Korede Omotosho"
    assert calls == []
