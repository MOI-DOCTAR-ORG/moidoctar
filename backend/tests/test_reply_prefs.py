"""Assistant Settings change what the model is told and what the user sees (Gemini is mocked)."""
import json

from test_ai_pool import FREE, KEY_A, _ai_payload, _reply, clean  # noqa: F401  (fixture)

from app.services import ai_keys, ai_memory, gemini_client, reply_prefs, triage_service
from app.services import triage_contract as contract

CHILD = {"patient": {"for": "child", "age_years": 8}, "flow": {"band": "age_6_11", "stage": "free"}}


def _run(monkeypatch, user, payload, context=None, text="I have a cough"):
    if not ai_keys.all_keys():
        ai_keys.add_key(KEY_A, "A")
    seen = {}

    def spy(key, model, body, timeout):
        seen["system"] = json.loads(body)["systemInstruction"]["parts"][0]["text"]
        return _reply(payload)

    monkeypatch.setattr(gemini_client, "_post", spy)
    res = triage_service.analyze_conversation(user, text, [{"role": "user", "content": text}],
                                              dict(context or FREE))
    return res, seen.get("system", "")


def _down(*a, **k):
    raise gemini_client.GeminiUnavailable("down")


# ── length ──────────────────────────────────────────────────────────────────

def test_short_answers_get_a_small_budget_and_two_steps(monkeypatch):
    ai_memory.set_preferences("p1", {"response_style": "concise"})
    steps = ["Rest and drink clean water.", "Watch how you feel.", "Get help if it gets worse."]
    res, system = _run(monkeypatch, "p1", _ai_payload("SELF_CARE", next_steps=steps))
    assert "15 words or fewer" in system and "at most 2 next steps" in system
    assert res["next_steps"] == steps[:2]


def test_detailed_keeps_three_steps_and_asks_for_a_reason(monkeypatch):
    ai_memory.set_preferences("p2", {"response_style": "detailed"})
    steps = ["Rest and drink clean water.", "Watch how you feel.", "Get help if it gets worse."]
    res, system = _run(monkeypatch, "p2", _ai_payload("SELF_CARE", next_steps=steps))
    assert "one-sentence \"reason\"" in system
    assert res["next_steps"] == steps


def test_length_applies_to_the_fixed_copy_too_and_keeps_the_escalation(monkeypatch):
    ai_memory.set_preferences("p3", {"response_style": "concise"})
    monkeypatch.setattr(gemini_client, "generate", _down)
    res = triage_service.analyze_conversation("p3", "he is having a seizure",
                                              [{"role": "user", "content": "he is having a seizure"}], dict(FREE))
    assert res["urgency"] == "EMERGENCY"
    assert len(res["next_steps"]) == 2 and "112" in res["next_steps"][0]


# ── tone ────────────────────────────────────────────────────────────────────

def test_tone_reaches_the_model(monkeypatch):
    ai_memory.set_preferences("t1", {"tone": "gentle"})
    _, gentle = _run(monkeypatch, "t1", _ai_payload("SELF_CARE"))
    ai_memory.set_preferences("t1", {"tone": "direct"})
    _, direct = _run(monkeypatch, "t1", _ai_payload("SELF_CARE"))
    assert "warm and reassuring" in gentle and "Tone: direct" in direct


# ── emergency number ────────────────────────────────────────────────────────

def test_own_emergency_number_in_the_fixed_copy_with_112_as_backup(monkeypatch):
    ai_memory.set_preferences("e1", {"emergency_number": "199"})
    monkeypatch.setattr(gemini_client, "generate", _down)
    res = triage_service.analyze_conversation("e1", "he is having a seizure",
                                              [{"role": "user", "content": "he is having a seizure"}], dict(FREE))
    assert res["next_steps"][0].startswith("Call 199 (or 112)")
    assert "199 (or 112)" in res["safety_note"]
    assert res["emergency_number"] == "199"


def test_model_told_the_number_and_may_not_invent_another(monkeypatch):
    ai_memory.set_preferences("e2", {"emergency_number": "767"})
    ok, system = _run(monkeypatch, "e2", _ai_payload("URGENT", next_steps=["Call 767 (or 112) if it gets worse."]))
    assert 'call 767 (or 112)' in system
    assert ok["ai_source"] == "gemini"
    bad, _ = _run(monkeypatch, "e2", _ai_payload("URGENT", next_steps=["Call 911 now."]))
    assert bad["ai_source"] == "rules" and "911" not in json.dumps(bad)


def test_default_number_leaves_the_copy_alone():
    assert reply_prefs.localize("Call 112 now.", {"emergency_number": "112"}) == "Call 112 now."
    assert reply_prefs.emergency_number({"emergency_number": "call me"}) == "112"


# ── units ───────────────────────────────────────────────────────────────────

def test_units_reach_the_model(monkeypatch):
    ai_memory.set_preferences("u1", {"units": "imperial"})
    _, system = _run(monkeypatch, "u1", _ai_payload("SELF_CARE"))
    assert "°F for temperature and lb for weight" in system


# ── language ────────────────────────────────────────────────────────────────

def test_untouched_default_language_still_mirrors_the_user(monkeypatch):
    _, system = _run(monkeypatch, "l1", _ai_payload("SELF_CARE"))
    assert "Write \"summary\"" not in system          # no forced language
    assert "If they wrote in English, reply in English" in system
    assert "mirror how the user writes" in system     # the base prompt's rule stands


def test_chosen_language_overrides_mirroring(monkeypatch):
    ai_memory.set_preferences("l2", {"language": "Pidgin"})
    res, system = _run(monkeypatch, "l2", _ai_payload("SELF_CARE", summary="Rest well, drink clean water."))
    assert "in Pidgin, even if the user writes in another language" in system
    assert '"english"' not in system                  # Pidgin is checked directly
    assert res["reply_language"] == "Pidgin"


def test_other_languages_are_checked_through_an_english_copy(monkeypatch):
    ai_memory.set_preferences("l3", {"language": "Yoruba"})
    yoruba = _ai_payload("SELF_CARE", summary="Sinmi daadaa.", next_steps=["Mu omi mimo."],
                         english={"summary": "Rest well.", "reason": None, "next_steps": ["Drink clean water."]})
    res, system = _run(monkeypatch, "l3", yoruba)
    assert '"english"' in system
    assert res["ai_source"] == "gemini" and res["summary"] == "Sinmi daadaa."


def test_no_english_copy_or_an_unsafe_one_falls_back(monkeypatch):
    ai_memory.set_preferences("l4", {"language": "Hausa"})
    missing, _ = _run(monkeypatch, "l4", _ai_payload("SELF_CARE", summary="Ka huta."))
    assert missing["ai_source"] == "rules"
    unsafe = _ai_payload("SELF_CARE", summary="Ka huta.",
                         english={"summary": "You have malaria, take paracetamol.", "next_steps": []})
    res, _ = _run(monkeypatch, "l4", unsafe)
    assert res["ai_source"] == "rules" and res["summary"] == contract.FIXED["SOON"]["summary"]  # rejected: the safer fixed level


# ── memory ──────────────────────────────────────────────────────────────────

def test_memory_on_saves_what_the_user_states(monkeypatch):
    learned = {"conditions_add": ["sickle cell"], "allergies_add": ["penicillin"], "medications_add": [], "facts": []}
    res, system = _run(monkeypatch, "m1", _ai_payload("SELF_CARE", remember=learned))
    assert '"remember"' in system
    mem = ai_memory.load("m1")
    assert "sickle cell" in mem["health_context"]["conditions"]
    assert "penicillin" in mem["health_context"]["allergies"]
    assert res["memory_notes"]
    # ...and next time the saved condition is used, the allergy is not sent.
    _, later = _run(monkeypatch, "m1", _ai_payload("SELF_CARE"))
    assert "sickle cell" in later and "penicillin" not in later


def test_memory_off_saves_nothing_and_uses_only_the_profile(monkeypatch):
    ai_memory.sync_health_context("m2", {"conditions": ["asthma"]}, "profile")
    ai_memory.apply_ai_updates("m2", {"conditions_add": ["diabetes"]})
    ai_memory.set_preferences("m2", {"remember_conversations": False})
    res, system = _run(monkeypatch, "m2", _ai_payload("SELF_CARE", remember={"conditions_add": ["epilepsy"]}))
    assert '"remember"' not in system
    assert "asthma" in system and "diabetes" not in system
    assert "epilepsy" not in ai_memory.load("m2")["health_context"]["conditions"]
    assert res["memory_notes"] == []


def test_caring_for_someone_else_uses_and_saves_nothing_about_the_user(monkeypatch):
    ai_memory.sync_health_context("m3", {"conditions": ["asthma"]}, "profile")
    res, system = _run(monkeypatch, "m3", _ai_payload("SELF_CARE", remember={"conditions_add": ["epilepsy"]}),
                       context=CHILD)
    assert "asthma" not in system and '"remember"' not in system
    assert "epilepsy" not in ai_memory.load("m3")["health_context"]["conditions"]


def test_trailing_comma_in_model_json_is_tolerated():
    assert gemini_client.parse_json_object('x {"a": [1, 2,], "b": {"c": 1,},} y') == {"a": [1, 2], "b": {"c": 1}}


def test_settings_survive_a_read_only_data_dir(monkeypatch, tmp_path):
    """Pxxl mounts the app read-only and app_settings may be missing: keep them in the temp dir."""
    from app.services import kv_store
    blocker = tmp_path / "blocker"
    blocker.write_text("a file, so no directory can be made under it (even as root)")
    monkeypatch.setattr(kv_store, "_DATA_DIR", str(blocker / "data"))
    monkeypatch.setattr(kv_store, "_TMP_DIR", str(tmp_path / "tmp"))
    monkeypatch.setattr(kv_store, "get_supabase_client", lambda: None)
    ai_memory.set_preferences("ro1", {"response_style": "concise", "emergency_number": "199"})
    prefs = ai_memory.load("ro1")["preferences"]
    assert prefs["response_style"] == "concise" and prefs["emergency_number"] == "199"
    assert (tmp_path / "tmp").is_dir()
