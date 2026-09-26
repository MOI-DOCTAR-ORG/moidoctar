"""Approved question flows, age profile and the under-6 pathway (Gemini is down unless mocked).

Each conversation is played the way the app plays it: the user taps an option
(its text becomes the message) and the client sends back the `flow` it got.
"""
import json
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "ai"))
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from app.services import ai_keys, pathways, triage_service  # noqa: E402
from app.services import triage_contract as contract  # noqa: E402
from moi_doctar_ai.rules import questions as pack_questions  # noqa: E402

ADULT = {"for": "self", "age_years": 34}


@pytest.fixture(autouse=True)
def clean():
    import shutil
    shutil.rmtree(os.environ["MOIDOCTAR_DATA_DIR"], ignore_errors=True)
    ai_keys._runtime.clear()
    yield


class Chat:
    def __init__(self, patient=None):
        self.patient = patient
        self.messages = []
        self.flow = None
        self.last = None

    def say(self, text):
        self.messages.append({"role": "user", "content": text})
        ctx = {"flow": self.flow}          # the current app always sends the key (null on the first turn)
        if self.patient is not None:
            ctx["patient"] = self.patient
        self.last = triage_service.analyze_conversation("u1", text, list(self.messages), ctx)
        q = self.last.get("follow_up_question")
        self.messages.append({"role": "model", "content": self.last["summary"] + (f" {q['text']}" if q else "")})
        self.flow = json.loads(json.dumps(self.last["flow"])) if self.last["flow"] else {}
        return self.last

    def answer(self, pick):
        """Tap the option whose text contains `pick` (or the first option when pick is an int)."""
        q = self.last["follow_up_question"]
        assert q, f"expected a question, got {self.last['status']}"
        opt = q["options"][pick] if isinstance(pick, int) else next(o for o in q["options"] if pick.lower() in o.lower())
        return self.say(opt)


# ── approved flows ──────────────────────────────────────────────────────────

def test_diarrhoea_uses_the_approved_table_one_question_at_a_time():
    c = Chat(ADULT)
    r = c.say("I have been stooling since yesterday")
    assert r["status"] == "question" and r["pathway"] == "diarrhea"
    # safety-critical questions first, then body areas; each question is the approved wording
    prompts = [q["prompt"] for q in pack_questions("diarrhea")]
    assert r["follow_up_question"]["text"] in prompts
    assert r["follow_up_question"]["type"] == "single_choice"


def test_a_red_answer_stops_the_table_and_is_emergency():
    c = Chat(ADULT)
    c.say("watery stool all day")
    r = c.answer("tented")           # pinch: stays tented -> red
    assert r["urgency"] == "EMERGENCY" and r["status"] == "emergency_stop"
    assert "112" in r["next_steps"][0]
    assert "tented" in (r["reason"] or "")


def test_a_full_green_table_is_monitor_at_home_with_approved_steps():
    c = Chat(ADULT)
    c.say("I have a cough")
    for _ in range(20):
        if c.last["status"] != "question":
            break
        opts = c.last["follow_up_question"]["options"]
        # the mildest option: "None of these", "No", "no reading", or the first (green) one
        pick = next((o for o in opts if o in ("None of these", "No", "I do not have a reading",
                                               "No cough, or a dry cough")), opts[0])
        c.say(pick)
    r = c.last
    assert r["urgency"] == "SELF_CARE" and r["pathway"] == "respiratory"
    assert 1 <= len(r["next_steps"]) <= 3 and r["indicator"]["color"] == "green"


def test_a_yellow_answer_is_urgent():
    c = Chat(ADULT)
    c.say("my blood pressure is high")
    r = c.answer("140/90 or higher")   # bp elevated -> yellow
    while r["status"] == "question":
        opts = r["follow_up_question"]["options"]
        r = c.say("None of these" if "None of these" in opts else "No")
    assert r["urgency"] == "URGENT" and r["pathway"] == "hypertension"


def test_unclear_concern_asks_which_table_and_something_else_goes_to_the_model(monkeypatch):
    c = Chat(ADULT)
    r = c.say("my knee hurts")
    assert r["follow_up_question"]["id"] == "concern"
    assert "Something else" in r["follow_up_question"]["options"]
    r = c.answer("Something else")   # Gemini is down here -> fixed fallback, not a table question
    assert r["follow_up_question"] is None or r["follow_up_question"]["id"] != "concern"
    assert c.flow.get("stage") == "free"


def test_a_tampered_flow_cannot_pick_its_own_answers():
    flow = {"band": "adult", "concern": "diarrhea", "answers": {"pinch": "made_up", "bogus": "red"}}
    clean = pathways.clean_flow(flow)
    assert clean["answers"] == {} and clean["concern"] == "diarrhea"
    assert pathways.clean_flow({"concern": "not_a_table"})["concern"] is None


def test_free_text_red_flag_still_wins_mid_table():
    c = Chat(ADULT)
    c.say("diarrhoea since morning")
    r = c.say("now he is unconscious")
    assert r["urgency"] == "EMERGENCY"


# ── age profile ─────────────────────────────────────────────────────────────

def test_age_is_asked_first_when_unknown_and_shown_on_the_result():
    c = Chat()
    r = c.say("I have a cough")
    assert r["follow_up_question"]["id"] == "profile.age_band"
    r = c.answer("Adult")
    assert r["profile"]["label"] == "Adult"
    assert r["follow_up_question"]["id"].startswith("respiratory.")


@pytest.mark.parametrize("patient,band", [
    ({"for": "child", "age_years": 3}, "under_6"),
    ({"for": "child", "age_years": 0, "age_months": 8}, "under_6"),
    ({"for": "child", "age_years": 9}, "pediatric_6_plus"),
    ({"for": "self", "age_years": 40}, "adult"),
])
def test_profile_bands(patient, band):
    assert pathways.patient_from_context({"patient": patient})["band"] == band


def test_self_uses_the_saved_profile_age():
    p = pathways.patient_from_context({"patient": {"for": "self"}, "profile": {"age": 29}})
    assert p["band"] == "adult"


# ── under 6 (addendum section 5) ────────────────────────────────────────────

def test_under_6_goes_through_the_safety_checks_not_a_table():
    c = Chat({"for": "child", "age_years": 2})
    r = c.say("my baby has diarrhoea")
    assert r["follow_up_question"]["id"].startswith("u6.") and r["profile"]["label"] == "Under 6"


def test_under_6_with_no_warning_sign_still_gets_professional_review():
    c = Chat({"for": "child", "age_years": 4})
    c.say("my child has a runny nose")
    c.answer("Yes, normally")
    c.answer("No")
    c.answer("Yes")
    r = c.answer("None of these")
    assert r["urgency"] == "SOON"                       # never "monitor at home" for under 6
    assert "health worker" in r["next_steps"][0].lower()


def test_under_6_cannot_drink_is_emergency_and_stops():
    c = Chat({"for": "child", "age_years": 1})
    c.say("my baby is sick")
    r = c.answer("cannot drink")
    assert r["urgency"] == "EMERGENCY" and r["follow_up_question"] is None


def test_under_6_no_wet_nappy_is_urgent():
    c = Chat({"for": "child", "age_years": 1})
    c.say("my baby is sick")
    c.answer("Yes, normally")
    c.answer("No")
    c.answer("No")                                        # no urine in 6 hours
    r = c.answer("None of these")
    assert r["urgency"] == "URGENT"


# ── validator: invented facilities (handoff section 7) ─────────────────────

@pytest.mark.parametrize("text", ["Visit Unity Hospital in Ikeja.", "Go to LUTH now.",
                                  "The clinic opens at 8am.", "Expect a wait of 30 minutes.",
                                  "It is at 12 Allen Avenue."])
def test_validator_blocks_invented_facilities_hours_and_waits(text):
    assert contract.unsafe_text(text)


@pytest.mark.parametrize("text", ["Go to the nearest hospital now.", "Go to a clinic today.",
                                  "Call 112 or go to the nearest emergency department now."])
def test_validator_allows_generic_care_advice(text):
    assert contract.unsafe_text(text) is None


def test_an_older_client_without_flow_keeps_the_model_led_path():
    """The previous frontend never sends `flow`; it must not loop on the age question."""
    r = triage_service.analyze_conversation("u1", "I have a cough", [{"role": "user", "content": "I have a cough"}], {})
    assert not (r.get("follow_up_question") or {}).get("id", "").startswith("profile.")
