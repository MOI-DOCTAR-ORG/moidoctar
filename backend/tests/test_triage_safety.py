"""Red-flag rules, the result contract, and the triage flow (Gemini is mocked).

Each test names the handoff/addendum rule it holds the code to.
"""
import io
import json
import os
import sys
import urllib.error

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "ai"))
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from app.services import ai_keys, gemini_client, red_flags, triage_service  # noqa: E402
from app.services import triage_contract as contract  # noqa: E402

KEY = "AIzaSyA" + "a" * 30


@pytest.fixture(autouse=True)
def clean():
    import shutil
    shutil.rmtree(os.environ["MOIDOCTAR_DATA_DIR"], ignore_errors=True)
    ai_keys._runtime.clear()
    yield


def _reply(payload):
    return {"candidates": [{"content": {"parts": [{"text": json.dumps(payload)}]}}]}


def _model(monkeypatch, payload, seen=None):
    ai_keys.add_key(KEY, "A")

    def post(key, model, body, timeout):
        if seen is not None:
            seen.append(json.loads(body))
        return _reply(payload)
    monkeypatch.setattr(gemini_client, "_post", post)


def _down(monkeypatch):
    ai_keys.add_key(KEY, "A")

    def post(*a, **k):
        raise urllib.error.HTTPError("u", 503, "down", {}, io.BytesIO(b""))
    monkeypatch.setattr(gemini_client, "_post", post)


def answer(level="SELF_CARE", **extra):
    base = {"status": "complete", "urgency": level, "has_symptoms": True, "summary": "This sounds mild for now.",
            "reason": None, "next_steps": ["Rest and drink clean water."], "follow_up_question": None,
            "escalation": {"required": level in ("EMERGENCY", "URGENT")}}
    base.update(extra)
    return base


# The model-led path: an adult whose concern is outside the approved tables ("Something else").
FREE = {"patient": {"for": "self", "age_years": 30}, "flow": {"band": "adult", "stage": "free"}}


def run(text, messages=None, context=None):
    return triage_service.analyze_conversation("u1", text, messages or [{"role": "user", "content": text}],
                                               context if context is not None else json.loads(json.dumps(FREE)))


# ── red flags ───────────────────────────────────────────────────────────────

@pytest.mark.parametrize("text", [
    "I have a mild dry cough and runny nose for 2 days  no chest pain and no trouble breathing",
    "cough but I don't have difficulty breathing",
    "no fever, no seizure, just tired",
    "I'm confused about when to take my medicine",
])
def test_negated_or_harmless_phrases_are_not_red_flags(text):
    """Seen live on 2026-09-26: 'no chest pain and no trouble breathing' was shown as URGENT."""
    assert red_flags.detect(text) == ([], [])


@pytest.mark.parametrize("text,flag", [
    ("I can't breathe", "severe_breathing_difficulty"),
    ("i no fit breathe well", "severe_breathing_difficulty"),
    ("my pikin no dey wake well", "unconscious_or_unresponsive"),
    ("his lips are turning blue", "blue_lips_or_face"),
    ("she had a fit this morning", "new_seizure"),
    ("I want to kill myself", "suicidal_immediate_danger"),
    ("baby e no gree drink water since morning", "severe_dehydration"),
    ("no wet diaper since yesterday", "severe_dehydration"),
    ("stool look like rice water", "severe_dehydration"),
    ("I am pregnant and bleeding", "severe_uncontrolled_bleeding"),
    ("he suddenly became confused", "sudden_confusion"),
    ("okada knocked him down, he was hit by a bike", "serious_injury"),
])
def test_emergency_red_flags_in_english_and_pidgin(text, flag):
    assert flag in red_flags.detect(text)[0]


def test_chest_pain_alone_is_urgent_and_with_breathing_is_emergency():
    """Handoff section 6: chest_pain_with_difficulty_breathing is the emergency flag."""
    assert red_flags.detect("I have chest pain") == ([], ["chest_pain"])
    emergency, _ = red_flags.detect("chest pain and I can't breathe")
    assert "chest_pain_with_difficulty_breathing" in emergency


@pytest.mark.parametrize("text,sign", [
    ("there is blood in my stool", "blood_or_black_stool"),
    ("my child keeps vomiting", "repeated_vomiting"),
    ("my pikin body hot well well", "high_fever"),
    ("e dey sleep too much", "unusual_sleepiness_or_weakness"),
])
def test_addendum_warning_signs_set_an_urgent_floor(text, sign):
    assert sign in red_flags.detect(text)[1]


# ── the contract validator (handoff section 7) ─────────────────────────────

def test_validator_accepts_a_good_answer():
    assert contract.validate(answer())["urgency"] == "SELF_CARE"


@pytest.mark.parametrize("bad", [
    answer(urgency="Moderate"),
    answer(next_steps=["a", "b", "c", "d"]),
    answer(summary=" ".join(["word"] * 36)),
    answer(level="EMERGENCY", escalation={"required": False}),
    answer(next_steps=["Take paracetamol for the pain."]),
    answer(next_steps=["Take 2 tablets every 6 hours."]),
    answer(summary="You have malaria."),
    answer(summary="You are definitely safe."),
    answer(status="question", urgency="INSUFFICIENT_INFORMATION", follow_up_question=None),
    "not json",
])
def test_validator_rejects_what_the_handoff_forbids(bad):
    with pytest.raises(contract.InvalidResult):
        contract.validate(bad)


# ── the flow ────────────────────────────────────────────────────────────────

def test_mild_cold_with_negations_is_not_escalated(monkeypatch):
    """The live bug, end to end: the model's SELF_CARE stands."""
    _model(monkeypatch, answer("SELF_CARE"))
    res = run("I have a mild dry cough and runny nose for 2 days  no chest pain and no trouble breathing")
    assert res["urgency"] == "SELF_CARE" and res["indicator"]["color"] == "green"
    assert res["urgency_level"] == "Stable" and res["possible_conditions"] == []


def test_red_flag_forces_emergency_and_stops_questions(monkeypatch):
    """Handoff section 6: a red flag forces EMERGENCY before and regardless of the model."""
    seen = []
    _model(monkeypatch, answer("SELF_CARE", status="question", urgency="INSUFFICIENT_INFORMATION",
                               follow_up_question={"id": "x", "text": "How long?", "options": ["1 day", "2 days"]}),
           seen)
    res = run("my baby is having a seizure")
    assert res["urgency"] == "EMERGENCY" and res["status"] == "emergency_stop"
    assert res["follow_up_question"] is None and res["escalation"]["required"] is True
    assert "112" in res["next_steps"][0]
    assert "already classified this case as EMERGENCY" in seen[0]["systemInstruction"]["parts"][0]["text"]


def test_emergency_still_works_when_the_model_is_down(monkeypatch):
    _down(monkeypatch)
    res = run("I can't breathe")
    assert res["urgency"] == "EMERGENCY" and res["ai_source"] == "rules"
    assert res["next_steps"] == contract.FIXED["EMERGENCY"]["next_steps"]


def test_pidgin_child_danger_is_caught_without_the_model(monkeypatch):
    """Seen live: the old keyword floor rated this Stable when the model was unavailable."""
    _down(monkeypatch)
    res = run("abeg my pikin wey be 2 years body hot well well since yesterday e no gree drink water and e dey sleep too much e no dey wake well")
    assert res["urgency"] == "EMERGENCY"


def test_warning_sign_raises_a_milder_model_answer_to_urgent(monkeypatch):
    _model(monkeypatch, answer("SOON", summary="See a clinic this week."))
    res = run("there is blood in my stool")
    assert res["urgency"] == "URGENT"
    assert res["summary"] == contract.FIXED["URGENT"]["summary"]  # the milder wording is not shown


def test_invalid_model_answer_is_replaced_with_fixed_copy(monkeypatch):
    _model(monkeypatch, answer("SELF_CARE", next_steps=["Take ibuprofen 400mg."]))
    res = run("headache since morning")
    assert res["ai_notice"] == contract.FALLBACK_MESSAGE
    assert "ibuprofen" not in json.dumps(res).lower()


def test_question_limit_forces_a_result(monkeypatch):
    """Handoff: no more than 5 assessment questions."""
    q = answer(status="question", urgency="INSUFFICIENT_INFORMATION", next_steps=[],
               follow_up_question={"id": "more", "text": "Anything else?", "options": ["Yes", "No"]})
    _model(monkeypatch, q)
    history = []
    for i in range(5):
        history += [{"role": "user", "content": f"answer {i}"}, {"role": "assistant", "content": f"Question {i}?"}]
    history.append({"role": "user", "content": "headache"})
    res = run("headache", history, {**FREE, "flow": {"band": "adult", "stage": "free", "free_asked": 5}})
    assert res["status"] == "complete" and res["urgency"] == "SOON"


def test_one_question_at_a_time_is_passed_through_with_options(monkeypatch):
    q = answer(status="question", urgency="INSUFFICIENT_INFORMATION", next_steps=[], summary="Thanks for telling me.",
               follow_up_question={"id": "duration", "text": "How long has it lasted?", "options": ["Today", "2-3 days", "Longer"]})
    _model(monkeypatch, q)
    res = run("headache")
    assert res["status"] == "question" and res["follow_up_question"]["options"] == ["Today", "2-3 days", "Longer"]
    assert res["follow_up_questions"] == ["How long has it lasted?"]
    assert res["next_steps"] == []


def test_dose_question_gets_the_medical_review_message(monkeypatch):
    """Addendum section 9: dosage guidance is not active."""
    _model(monkeypatch, answer("SELF_CARE"))
    res = run("mild headache, how many tablets can i take")
    assert res["medication_notice"] == contract.MEDICATION_REVIEW_MESSAGE
    assert contract.MEDICATION_REVIEW_MESSAGE in res["reply"]


def test_safety_note_uses_the_local_emergency_number(monkeypatch):
    _model(monkeypatch, answer("SELF_CARE"))
    res = run("mild headache")
    assert "112" in res["safety_note"] and "911" not in json.dumps(res)
