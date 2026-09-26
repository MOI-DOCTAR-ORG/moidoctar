"""Tests for key rotation, safety floor, and memory tracking (Gemini is mocked)."""
import json
import os
import sys
import urllib.error
import io

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "ai"))
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.api.deps import get_current_admin, get_current_user  # noqa: E402
from app.services import ai_keys, ai_memory, gemini_client  # noqa: E402
from app.services import triage_service  # noqa: E402

KEY_A = "AIzaSyA" + "a" * 30
KEY_B = "AIzaSyB" + "b" * 30
# The model-led path (an adult, concern outside the approved tables).
FREE = {"patient": {"for": "self", "age_years": 30}, "flow": {"band": "adult", "stage": "free"}}


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    import shutil
    shutil.rmtree(os.environ["MOIDOCTAR_DATA_DIR"], ignore_errors=True)
    ai_keys._runtime.clear()
    monkeypatch.setattr(ai_keys.settings, "GOOGLE_API_KEY", "")
    monkeypatch.setattr(ai_keys.settings, "GOOGLE_API_KEYS", "")
    gemini_client._dead_models.clear()
    yield


def _reply(payload):
    return {"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}]}


def _http_error(code, body="x"):
    return urllib.error.HTTPError("u", code, "err", {}, io.BytesIO(body.encode()))


def test_rotation_and_failover(monkeypatch):
    ai_keys.add_key(KEY_A, "A")
    ai_keys.add_key(KEY_B, "B")
    calls = []

    def fake_post(key, model, body, timeout):
        calls.append(key)
        if key == KEY_A:
            raise _http_error(429, "rate")
        return _reply({"ok": True})

    monkeypatch.setattr(gemini_client, "_post", fake_post)
    gemini_client.generate([{"role": "user", "parts": [{"text": "hi"}]}])
    assert calls[-1] == KEY_B
    view = {k["label"]: k for k in ai_keys.public_view()}
    assert view["A"]["status"] == "cooling_down"
    assert view["B"]["uses"] == 1
    # cooled-down key is skipped on the next call
    calls.clear()
    gemini_client.generate([{"role": "user", "parts": [{"text": "hi"}]}])
    assert calls == [KEY_B]


def test_env_keys_and_no_keys(monkeypatch):
    with pytest.raises(gemini_client.GeminiUnavailable):
        gemini_client.generate([{"role": "user", "parts": [{"text": "hi"}]}])
    monkeypatch.setattr(ai_keys.settings, "GOOGLE_API_KEYS", f"{KEY_A}, {KEY_B}")
    assert len(ai_keys.public_view()) == 2
    assert all(k["masked"].count("…") == 1 for k in ai_keys.public_view())


def test_bad_model_does_not_burn_key(monkeypatch):
    ai_keys.add_key(KEY_A, "A")

    def fake_post(key, model, body, timeout):
        if model == "gemini-flash-latest":
            raise _http_error(404)
        return _reply({"ok": True})

    monkeypatch.setattr(gemini_client, "_post", fake_post)
    _, meta = gemini_client.generate([{"role": "user", "parts": [{"text": "hi"}]}])
    assert meta["model"] != "gemini-flash-latest"
    assert ai_keys.public_view()[0]["status"] == "ok"


def _ai_payload(level, **extra):
    """A model answer in the handoff contract shape."""
    base = {"status": "complete", "urgency": level, "has_symptoms": True, "summary": "Thanks, I noted that.",
            "reason": "because", "next_steps": ["Rest and drink clean water."], "follow_up_question": None,
            "escalation": {"required": level in ("EMERGENCY", "URGENT")}}
    base.update(extra)
    return base


def test_ai_cannot_lower_urgency(monkeypatch):
    ai_keys.add_key(KEY_A, "A")
    monkeypatch.setattr(gemini_client, "_post", lambda *a, **k: _reply(_ai_payload("SELF_CARE")))
    res = triage_service.analyze_conversation("u1", "I have crushing chest pain", [{"role": "user", "content": "I have crushing chest pain"}], dict(FREE))
    assert res["urgency"] == "URGENT" and res["urgency_level"] == "Urgent"
    assert res["ai_source"] == "gemini"


def test_fallback_when_ai_down(monkeypatch):
    res = triage_service.analyze_conversation("u1", "mild cough", [{"role": "user", "content": "mild cough"}], dict(FREE))
    assert res["ai_source"] == "rules" and res["ai_notice"]


def test_prompt_sends_reply_preferences_not_the_health_record(monkeypatch):
    """Handoff section 8: don't send unnecessary personal or health information to the model."""
    ai_keys.add_key(KEY_A, "A")
    ai_memory.sync_health_context("u2", {"allergies": ["penicillin"], "conditions": ["asthma"]}, "profile")
    ai_memory.set_preferences("u2", {"tone": "direct", "units": "bogus"})
    mem = ai_memory.load("u2")
    assert mem["preferences"]["tone"] == "direct" and mem["preferences"]["units"] == "metric"
    seen = {}

    def spy(key, model, body, timeout):
        seen["body"] = json.loads(body)
        return _reply(_ai_payload("SELF_CARE"))

    monkeypatch.setattr(gemini_client, "_post", spy)
    res = triage_service.analyze_conversation("u2", "cough", [{"role": "user", "content": "cough"}], dict(FREE))
    sys_text = seen["body"]["systemInstruction"]["parts"][0]["text"]
    assert "'tone': 'direct'" in sys_text
    assert "penicillin" not in sys_text and "asthma" not in sys_text
    assert res["memory_notes"] == []


def test_endpoints(monkeypatch):
    user = {"_id": "u3", "email": "a@b.co", "role": "admin"}
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_current_admin] = lambda: user
    monkeypatch.setattr(gemini_client, "_post", lambda *a, **k: _reply({"ok": True}))
    c = TestClient(app)
    try:
        r = c.post("/api/v1/ai/keys", json={"key": KEY_A, "label": "First"})
        assert r.status_code == 200 and r.json()["test"]["ok"]
        assert KEY_A not in r.text
        assert c.post("/api/v1/ai/keys", json={"key": KEY_A}).status_code == 400
        assert c.post("/api/v1/ai/keys", json={"key": "short"}).status_code == 400
        kid = r.json()["added_id"]
        assert c.patch(f"/api/v1/ai/keys/{kid}", json={"enabled": False}).json()["keys"][0]["enabled"] is False
        assert c.delete(f"/api/v1/ai/keys/{kid}").json()["keys"] == []
        assert c.put("/api/v1/ai/preferences", json={"response_style": "detailed"}).json()["preferences"]["response_style"] == "detailed"
        monkeypatch.setattr(gemini_client, "_post", lambda *a, **k: _reply(_ai_payload("SOON")))
        ai_keys.add_key(KEY_B, "B")
        r = c.post("/api/v1/triage/chat", json={"symptoms": "fever", "messages": [{"role": "ai", "text": "Hi"}, {"role": "user", "content": "fever 2 days"}],
                         "context": FREE})
        assert r.status_code == 200, r.text
        assert r.json()["reply"] and r.json()["ai_source"] == "gemini"
        assert r.json()["urgency"] == "SOON" and r.json()["indicator"]["color"] == "yellow"
        r = c.post("/api/v1/triage/chat", data={"symptoms": "fever", "messages": "[]", "context": json.dumps({"profile": {"allergies": ["dust"]}, **FREE})},
                   files={"image": ("a.jpg", b"\xff\xd8\xff", "image/jpeg")})
        assert r.status_code == 200
        assert "dust" in ai_memory.load("u3")["health_context"]["allergies"]
    finally:
        app.dependency_overrides.clear()


def test_profile_sync_keeps_ai_learned_items():
    """Regression: the next chat turn re-sends the profile; it must not erase what the AI learned."""
    ai_memory.sync_health_context("u9", {"conditions": ["diabetes"]}, "profile")
    ai_memory.apply_ai_updates("u9", {"conditions_add": ["asthma"]})
    ai_memory.sync_health_context("u9", {"conditions": ["diabetes"]}, "profile")
    assert ai_memory.load("u9")["health_context"]["conditions"] == ["diabetes", "asthma"]
    # removing something from the profile removes it from memory, but only that item
    ai_memory.sync_health_context("u9", {"conditions": []}, "profile")
    assert ai_memory.load("u9")["health_context"]["conditions"] == ["asthma"]
    # an explicit edit in AI settings is exact
    ai_memory.sync_health_context("u9", {"conditions": ["hypertension"]}, "user")
    assert ai_memory.load("u9")["health_context"]["conditions"] == ["hypertension"]


def test_chat_turns_update_one_history_entry(monkeypatch):
    import uuid
    sid, uid = str(uuid.uuid4()), "hist_user"
    for text in ("headache", "headache for two days", "headache, now with fever"):
        triage_service.save_triage_session(uid, [text], {"urgency_level": "Moderate", "recommended_actions": ["Rest"]}, session_id=sid)
    rows = [r for r in triage_service.get_triage_history(uid)]
    assert len(rows) == 1 and rows[0]["symptoms"] == ["headache, now with fever"]


def test_history_items_expose_id():
    """Regression: `_id` used to be a private pydantic attr and was dropped, so the History page got undefined ids."""
    import uuid
    from app.schemas.triage import TriageListResponse
    uid = "id_user"
    triage_service.save_triage_session(uid, ["cough"], {"urgency_level": "Stable", "recommended_actions": ["Rest"]}, session_id=str(uuid.uuid4()))
    payload = TriageListResponse(data=triage_service.get_triage_history(uid)).model_dump(by_alias=True)
    assert payload["data"][0]["_id"]
