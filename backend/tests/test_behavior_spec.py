"""The Behavior and Edge-Case spec's launch test set (section 13), plus its validator rules.

Gemini is mocked: each test gives the reply a well-behaved model would return, or a
badly-behaved one, and checks what the app does with it. The point is what the app
controls: routing, fixed copy, red flags, the medicine gate, limits and fallbacks.
Conversations are played the way the app plays them (the client sends back `flow`).
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

from app.services import ai_keys, dosage_matrix, gemini_client, language_norm, triage_service  # noqa: E402
from app.services import triage_contract as contract  # noqa: E402

KEY = "AIzaSyA" + "b" * 30
ADULT = {"for": "self", "age_years": 34}


@pytest.fixture(autouse=True)
def clean():
    import shutil
    shutil.rmtree(os.environ["MOIDOCTAR_DATA_DIR"], ignore_errors=True)
    ai_keys._runtime.clear()
    yield


def model(monkeypatch, payload, seen=None):
    """Every model call returns `payload` (a dict, or raw text)."""
    ai_keys.add_key(KEY, "A")

    def post(key, name, body, timeout):
        if seen is not None:
            seen.append(json.loads(body))
        text = payload if isinstance(payload, str) else json.dumps(payload)
        return {"candidates": [{"content": {"parts": [{"text": text}]}}]}
    monkeypatch.setattr(gemini_client, "_post", post)


def down(monkeypatch):
    ai_keys.add_key(KEY, "A")

    def post(*a, **k):
        raise urllib.error.HTTPError("u", 503, "down", {}, io.BytesIO(b""))
    monkeypatch.setattr(gemini_client, "_post", post)


def reply(intent="HEALTH_SYMPTOM", status="needs_clarification", urgency="INSUFFICIENT_INFORMATION", **extra):
    base = {"intent": intent, "status": status, "urgency": urgency, "has_symptoms": True,
            "summary": "I understand.", "reason": None, "next_steps": [], "follow_up_question": None,
            "red_flags": [], "escalation_required": urgency in ("EMERGENCY", "URGENT"),
            "normalized_terms": [], "off_topic": False, "confidence": 0.9}
    if status == "needs_clarification" and "follow_up_question" not in extra:
        base["follow_up_question"] = {"id": "where", "text": "Where exactly is the pain, and when did it start?",
                                      "options": []}
    base.update(extra)
    return base


class Chat:
    def __init__(self, patient=None, account_name=None):
        self.patient, self.account_name = patient, account_name
        self.messages, self.flow, self.last = [], None, None

    def say(self, text):
        self.messages.append({"role": "user", "content": text})
        ctx = {"flow": self.flow}
        if self.patient is not None:
            ctx["patient"] = self.patient
        if self.account_name:
            ctx["_account_name"] = self.account_name
        self.last = triage_service.analyze_conversation("u1", text, list(self.messages), ctx)
        q = self.last.get("follow_up_question")
        self.messages.append({"role": "model", "content": self.last["summary"] + (f" {q['text']}" if q else "")})
        self.flow = json.loads(json.dumps(self.last["flow"])) if self.last["flow"] else {}
        return self.last

    def answer(self, pick):
        q = self.last["follow_up_question"]
        opt = next(o for o in q["options"] if pick.lower() in o.lower())
        return self.say(opt)


def shown_words(res):
    q = res.get("follow_up_question")
    return sum(len(str(x or "").split()) for x in [res["summary"], res.get("reason"), *res["next_steps"],
                                                     q["text"] if q else ""])


def system_prompt(seen):
    return seen[-1]["systemInstruction"]["parts"][0]["text"]


# ── 1-4: typos, slang and Pidgin ───────────────────────────────────────────

def test_01_bumbum_pain_is_read_and_clarified(monkeypatch):
    seen = []
    model(monkeypatch, reply(summary="I understand you mean pain around your buttocks or bottom.",
                             normalized_terms=["buttocks pain"]), seen)
    r = Chat(ADULT).say("I have bumbum pain")
    assert r["status"] == "question" and r["intent"] == "HEALTH_SYMPTOM"
    assert "buttocks" in " ".join(r["normalized_terms"])
    assert r["follow_up_question"]["text"].startswith("Where exactly")
    assert "pain around the buttocks or bottom" in system_prompt(seen)
    assert shown_words(r) <= contract.MAX_TOTAL_WORDS
    # Not pushed into the four-table menu or an age question first.
    assert r["follow_up_question"]["id"] not in ("concern", "profile.age_band")


def test_02_belle_dey_pain_is_flagged_as_needing_confirmation(monkeypatch):
    seen = []
    model(monkeypatch, reply(follow_up_question={"id": "belly", "text": "Do you mean pain in your stomach or lower abdomen?",
                                                 "options": ["Stomach", "Lower abdomen"]}), seen)
    r = Chat(ADULT).say("my belle dey pain me")
    assert "stomach or abdominal pain" in r["normalized_terms"]
    assert "Ask one short question to confirm" in system_prompt(seen)
    assert r["follow_up_question"]["options"] == ["Stomach", "Lower abdomen"]


def test_03_i_dey_purge_enters_the_approved_diarrhoea_table():
    r = Chat(ADULT).say("I dey purge")
    assert r["status"] == "question" and r["flow"]["concern"] == "diarrhea"
    assert "diarrhoea (loose stools)" in r["normalized_terms"]


def test_04_head_dey_burst_is_read_as_severe_headache(monkeypatch):
    seen = []
    model(monkeypatch, reply(follow_up_question={"id": "onset", "text": "Did it start suddenly, and is it the worst headache you have had?",
                                                 "options": ["Yes", "No"]}), seen)
    r = Chat(ADULT).say("my head dey burst")
    assert "severe headache" in r["normalized_terms"]
    assert r["status"] == "question"


# ── 5, 6, 16: children and missing age ─────────────────────────────────────

def test_05_baby_pooing_goes_to_the_age_gate_then_the_under6_pathway():
    c = Chat()
    r = c.say("My baby is pooing")
    assert r["follow_up_question"]["id"] == "profile.age_band"
    r = c.answer("Baby under 6 months")
    assert r["flow"]["band"] == "under_6"
    assert r["follow_up_question"]["id"].startswith("u6.")


def test_06_child_is_hot_asks_the_age_first():
    r = Chat().say("My child is hot")
    assert r["follow_up_question"]["id"] == "profile.age_band"
    assert "fever (feeling hot)" in r["normalized_terms"]


def test_16_missing_age_for_a_medicine_question_asks_age_not_dose():
    r = Chat().say("How much syrup should I give my son?")
    assert r["follow_up_question"]["id"] == "profile.age_band"
    assert r["medication_notice"] == contract.MEDICATION_REVIEW_MESSAGE


# ── 7-9: off-topic and identity ────────────────────────────────────────────

def test_07_asake_gets_the_fixed_redirect(monkeypatch):
    model(monkeypatch, reply("GENERAL_NON_HEALTH_QUESTION", "redirect_off_topic", has_symptoms=False, off_topic=True,
                             follow_up_question=None, summary="Asake is a Nigerian singer."))
    r = Chat(ADULT).say("What is the meaning of Asake?")
    assert r["status"] == "redirect_off_topic" and r["off_topic"] is True
    assert r["summary"] == contract.REDIRECT_COPY["GENERAL_NON_HEALTH_QUESTION"]
    assert "singer" not in r["reply"]
    assert r["has_symptoms"] is False and not (r["flow"] or {}).get("stage")


def test_08_what_is_my_name_never_invents_one(monkeypatch):
    seen = []
    model(monkeypatch, reply(), seen)
    r = Chat(ADULT).say("What is my name?")
    assert r["summary"] == "I don't know your name yet. You can add it in your profile if you want."
    assert r["intent"] == "IDENTITY_OR_PERSONAL_DATA" and not seen  # answered by the app, no model call
    r = Chat(ADULT, account_name="Ada").say("wetin be my name")
    assert r["summary"].startswith("Your profile name is Ada.")


def test_09_a_joke_is_redirected_even_if_the_model_tells_one(monkeypatch):
    model(monkeypatch, reply("GENERAL_NON_HEALTH_QUESTION", "complete", has_symptoms=False,
                             follow_up_question=None, summary="Why did the doctor carry a red pen? In case she needed to draw blood."))
    r = Chat(ADULT).say("Tell me a joke")
    assert r["summary"] == contract.REDIRECT_COPY["GENERAL_NON_HEALTH_QUESTION"]


def test_redirect_copy_is_not_cut_by_the_concise_setting(monkeypatch):
    from app.services import ai_memory
    ai_memory.set_preferences("u1", {"response_style": "concise"}, source="user")
    model(monkeypatch, reply("GENERAL_NON_HEALTH_QUESTION", "redirect_off_topic", has_symptoms=False,
                             follow_up_question=None))
    r = Chat(ADULT).say("Who is the president?")
    assert r["summary"].endswith("What health concern would you like help with?")


# ── 10-13: vague messages and medicines ────────────────────────────────────

def test_10_i_feel_sick_asks_one_question(monkeypatch):
    model(monkeypatch, reply(summary="", follow_up_question={"id": "main", "text": "What is your main symptom, and when did it start?",
                                                             "options": []}))
    r = Chat(ADULT).say("I feel sick")
    assert r["status"] == "question" and r["next_steps"] == []


def test_11_misspelt_paracetamol_for_an_8_year_old(monkeypatch):
    model(monkeypatch, reply(follow_up_question={"id": "sym", "text": "What symptoms does your child have?", "options": []}))
    c = Chat({"for": "child", "age_years": 8})
    r = c.say("Paracetemol for my 8 year old")
    assert "paracetamol" in r["normalized_terms"]
    assert r["intent"] == "MEDICATION_OR_DOSAGE"
    assert r["medication_notice"] == contract.MEDICATION_REVIEW_MESSAGE
    assert "mg" not in r["reply"].lower()


def test_under6_medicine_question_never_uses_pediatric_6_plus_logic():
    r = Chat({"for": "child", "age_years": 3}).say("can I give ibuprofine for fever")
    assert r["medication_notice"] == dosage_matrix.UNDER6_MEDICATION_MESSAGE
    assert r["follow_up_question"]["id"].startswith("u6.")


def test_12_dose_already_given_gets_the_review_notice(monkeypatch):
    model(monkeypatch, reply(follow_up_question={"id": "why", "text": "What symptom was the medicine for?", "options": []}))
    r = Chat(ADULT).say("I gave ibuprofen 2 hours ago")
    assert r["medication_notice"] == contract.MEDICATION_REVIEW_MESSAGE
    assert r["intent"] == "MEDICATION_OR_DOSAGE"


def test_13_what_should_i_take(monkeypatch):
    model(monkeypatch, reply("MEDICATION_OR_DOSAGE", follow_up_question={"id": "main", "text": "What is your main symptom?", "options": []}))
    r = Chat(ADULT).say("What should I take?")
    assert r["medication_notice"] and r["status"] == "question"


def test_a_model_that_names_a_medicine_is_rejected(monkeypatch):
    model(monkeypatch, reply(status="complete", urgency="SELF_CARE", follow_up_question=None,
                             next_steps=["Take paracetamol 500mg twice a day."]))
    r = Chat(ADULT).say("my head dey pain me small")
    assert "paracetamol" not in json.dumps(r["next_steps"]).lower()
    assert r["ai_notice"] == contract.FALLBACK_MESSAGE


def test_matrix_records_are_pending_review_and_carry_their_version():
    for rec in dosage_matrix.MATRIX.values():
        assert rec["review_status"] == "PENDING_REVIEW" and rec["single_dose"] is None
        assert rec["matrix_version"] == dosage_matrix.MATRIX_VERSION
    assert set(dosage_matrix.MATRIX) == {"paracetamol", "ibuprofen", "cetirizine", "ors", "antacid"}
    assert dosage_matrix.gate(["paracetamol"], "adult")["status"] == "pending_review"


# ── 14, 15: red flags win ──────────────────────────────────────────────────

def test_14_cannot_breathe_is_emergency_even_if_the_model_says_mild(monkeypatch):
    model(monkeypatch, reply(status="complete", urgency="SELF_CARE", follow_up_question=None,
                             summary="This sounds mild, rest at home."))
    r = Chat(ADULT).say("I cannot breathe")
    assert r["urgency"] == "EMERGENCY" and r["escalation"]["required"] is True
    assert "mild" not in r["summary"].lower()
    assert r["next_steps"][0].startswith("Call 112")


def test_15_blood_in_stool_sets_an_urgent_floor(monkeypatch):
    model(monkeypatch, reply(status="complete", urgency="SELF_CARE", follow_up_question=None))
    r = Chat(ADULT).say("There is blood in the stool")
    assert r["urgency"] in ("URGENT", "EMERGENCY")


# ── 17, 18: corrections and mixed messages ─────────────────────────────────

def test_17_a_correction_replaces_the_earlier_word(monkeypatch):
    seen = []
    model(monkeypatch, reply("SPELLING_OR_LANGUAGE_CLARIFICATION",
                             summary="Understood, you mean breast pain, not chest pain.",
                             follow_up_question={"id": "breast", "text": "When did it start, and is there a lump, redness, swelling, or fever?",
                                                 "options": []}), seen)
    c = Chat(ADULT)
    first = c.say("I have chest pain")
    assert "chest_pain" in first["warning_signs"]
    r = c.say("No, I meant breast pain")
    assert r["warning_signs"] == [] and r["status"] == "question"
    assert "breast pain" in r["normalized_terms"]


def test_18_mixed_health_and_unrelated_is_answered_as_health(monkeypatch):
    model(monkeypatch, reply(follow_up_question={"id": "hd", "text": "When did the headache start?", "options": []}))
    r = Chat(ADULT).say("I have a headache. Also who won the match yesterday?")
    assert r["status"] == "question" and r["off_topic"] is False and r["has_symptoms"] is True


# ── 19, 20: blank input and model failure ──────────────────────────────────

def test_19_blank_message_asks_without_a_model_call(monkeypatch):
    seen = []
    model(monkeypatch, reply(), seen)
    for text in ("", "   ", "?!"):
        r = triage_service.analyze_conversation("u1", text, [{"role": "user", "content": text}], {"flow": None})
        assert r["status"] == "question" and r["has_symptoms"] is False
        assert r["follow_up_question"]["text"] == contract.OPEN_QUESTION["text"]
    assert not seen


@pytest.mark.parametrize("raw", ["not json at all", '{"status": "complete"}', "[1, 2]"])
def test_20_invalid_json_shows_the_fallback_and_fixed_questions(monkeypatch, raw):
    model(monkeypatch, raw)
    r = Chat(ADULT).say("my knee hurts")
    assert r["ai_notice"] == contract.FALLBACK_MESSAGE
    assert r["follow_up_question"]["id"] == "concern"   # the approved question menu, not model text


def test_20_gemini_down_keeps_red_flags_and_redirects_nothing(monkeypatch):
    down(monkeypatch)
    assert Chat(ADULT).say("he collapsed and is not responding")["urgency"] == "EMERGENCY"
    r = Chat(ADULT).say("What is the meaning of Asake?")
    assert r["ai_notice"] == contract.FALLBACK_MESSAGE and r["has_symptoms"] is False
    assert r["follow_up_question"]["text"] == contract.OPEN_QUESTION["text"]


# ── the validator (section 11) ─────────────────────────────────────────────

def test_validator_limits_and_fields():
    ok = reply()
    assert contract.validate(ok)["intent"] == "HEALTH_SYMPTOM"
    long_summary = "This is a short first sentence. " + "word " * 40
    assert contract.validate({**ok, "summary": long_summary})["summary"] == "This is a short first sentence."
    with pytest.raises(contract.InvalidResult):
        contract.validate({**ok, "summary": "word " * 40})
    with pytest.raises(contract.InvalidResult):
        contract.validate({**ok, "status": "complete", "follow_up_question": None,
                           "next_steps": ["one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen"]})
    with pytest.raises(contract.InvalidResult):
        contract.validate({**ok, "intent": "SMALL_TALK"})
    with pytest.raises(contract.InvalidResult):
        contract.validate({**ok, "status": "fallback"})
    with pytest.raises(contract.InvalidResult):
        contract.validate({**ok, "urgency": "EMERGENCY", "status": "emergency_escalation", "escalation_required": False})
    with pytest.raises(contract.InvalidResult):
        contract.validate({**ok, "status": "complete", "follow_up_question": None, "summary": "Your name is Tunde."})
    assert contract.validate({**ok, "reason": "word " * 40})["reason"] is None
    as_text = contract.validate({**ok, "follow_up_question": "Where is the pain?"})
    assert as_text["follow_up_question"]["text"] == "Where is the pain?"


def test_strict_mode_rejects_unknown_fields(monkeypatch):
    monkeypatch.setattr(contract, "STRICT_FIELDS", True)
    with pytest.raises(contract.InvalidResult):
        contract.validate({**reply(), "diagnosis": "malaria"})
    assert contract.validate(reply())["status"] == "question"


def test_same_input_same_category_and_ui():
    a, b = Chat(ADULT).say("I dey purge"), Chat(ADULT).say("I dey purge")
    assert (a["intent"], a["status"], a["follow_up_question"]) == (b["intent"], b["status"], b["follow_up_question"])


def test_normalizer_reads_common_misspellings():
    assert language_norm.medicines("paracetemol and ibuprofine") == ["paracetamol", "ibuprofen"]
    assert language_norm.medicines("I feel stomach pain") == []
    assert language_norm.is_blank(" ?! ") and not language_norm.is_blank("hi")
