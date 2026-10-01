"""Support-page assistant: guide-only answers, health messages sent to triage, safe failure."""
import io
import json
import os
import sys
import urllib.error

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from app.services import ai_keys, gemini_client, support_chat  # noqa: E402

KEY = "AIzaSyA" + "c" * 30
GUIDES = [{"id": "med-reminders", "title": "Set a medication reminder", "text": "Open Medication, tap Add, pick a time."},
          {"id": "first-triage", "title": "Run your first triage", "text": "Open Triage and describe how you feel."}]


@pytest.fixture(autouse=True)
def clean():
    import shutil
    shutil.rmtree(os.environ["MOIDOCTAR_DATA_DIR"], ignore_errors=True)
    ai_keys._runtime.clear()
    yield


def model(monkeypatch, payload, seen=None):
    ai_keys.add_key(KEY, "A")

    def post(key, name, body, timeout):
        if seen is not None:
            seen.append(json.loads(body))
        return {"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}]}
    monkeypatch.setattr(gemini_client, "_post", post)


def test_answers_from_the_guides_and_links_one(monkeypatch):
    seen = []
    model(monkeypatch, {"intent": "APP_HELP", "answer": "Open Medication, tap Add, then pick a time.",
                        "article_id": "med-reminders", "offer_human": False}, seen)
    r = support_chat.answer("how do I set a reminder", [], GUIDES)
    assert r["source"] == "gemini" and r["article_id"] == "med-reminders"
    assert "[med-reminders] Set a medication reminder" in seen[0]["systemInstruction"]["parts"][0]["text"]


def test_unknown_article_ids_are_dropped(monkeypatch):
    model(monkeypatch, {"intent": "APP_HELP", "answer": "See the guide.", "article_id": "made-up", "offer_human": False})
    assert support_chat.answer("help", [], GUIDES)["article_id"] is None


def test_symptoms_go_to_triage_and_red_flags_skip_the_model(monkeypatch):
    seen = []
    model(monkeypatch, {"intent": "HEALTH_SYMPTOM", "answer": "You may have malaria.", "article_id": None,
                        "offer_human": False}, seen)
    r = support_chat.answer("my belle dey pain me", [], GUIDES)
    assert r["reply"] == support_chat.SYMPTOM_REPLY and "malaria" not in r["reply"]
    seen.clear()
    r = support_chat.answer("my father collapsed and is not responding", [], GUIDES)
    assert r["tone"] == "alert" and not seen


def test_off_topic_is_redirected(monkeypatch):
    model(monkeypatch, {"intent": "GENERAL_NON_HEALTH_QUESTION", "answer": "Asake is a singer.",
                        "article_id": None, "offer_human": False})
    assert support_chat.answer("who is Asake", [], GUIDES)["reply"] == support_chat.OFF_TOPIC_REPLY


@pytest.mark.parametrize("bad", [
    {"intent": "APP_HELP", "answer": "Take paracetamol 500mg.", "article_id": None},
    {"intent": "APP_HELP", "answer": "Call us on 0803 123 4567.", "article_id": None},
    {"intent": "APP_HELP", "answer": "word " * 90, "article_id": None},
    {"intent": "CHAT", "answer": "hi", "article_id": None},
])
def test_unsafe_or_invalid_answers_fail_so_the_page_falls_back(monkeypatch, bad):
    model(monkeypatch, bad)
    with pytest.raises(support_chat.Unavailable):
        support_chat.answer("question", [], GUIDES)


def test_model_down_raises_unavailable(monkeypatch):
    ai_keys.add_key(KEY, "A")

    def post(*a, **k):
        raise urllib.error.HTTPError("u", 503, "down", {}, io.BytesIO(b""))
    monkeypatch.setattr(gemini_client, "_post", post)
    with pytest.raises(support_chat.Unavailable):
        support_chat.answer("how do I sign out", [], GUIDES)
