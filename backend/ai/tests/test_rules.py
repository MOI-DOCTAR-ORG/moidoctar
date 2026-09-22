import pytest

from moi_doctar_ai.pack_data import DISCLAIMER
from moi_doctar_ai.rules import PackError, decide, questions

CONCERNS = ("typhoid", "respiratory", "hypertension", "diarrhea")
BANNED = ("ciprofloxacin", "azithromycin", " mg", "milligram")


def fill(concern_id, **overrides):
    answers = {}
    for question in questions(concern_id):
        answers[question["id"]] = question["options"][0]["id"]
    answers.update(overrides)
    return answers


def test_every_concern_has_the_seven_body_areas():
    for concern_id in CONCERNS:
        ids = [question["id"] for question in questions(concern_id)]
        for area in ("head", "chest", "breathing", "abdomen", "limbs", "skin", "allergies"):
            assert area in ids


def test_red_outranks_yellow_and_green():
    result = decide("typhoid", fill("typhoid", abdomen="red", head="yellow"))
    assert result["urgency"] == "red"
    assert result["headline"].startswith("Emergency")
    assert DISCLAIMER in result["steps"][-1]


def test_yellow_without_red():
    result = decide("typhoid", fill("typhoid", skin="yellow"))
    assert result["urgency"] == "yellow"


def test_all_clear_is_green_and_not_a_drug_order():
    result = decide("typhoid", fill("typhoid"))
    assert result["urgency"] == "green"
    blob = " ".join(result["steps"]).lower()
    for word in BANNED:
        assert word not in blob


def test_missing_answer_is_rejected():
    answers = fill("diarrhea")
    answers.pop("pinch")
    with pytest.raises(PackError):
        decide("diarrhea", answers)


def test_rice_water_and_pinch_and_fluids_are_emergency():
    assert decide("diarrhea", fill("diarrhea", rice_water="yes"))["urgency"] == "red"
    assert decide("diarrhea", fill("diarrhea", pinch="tent"))["urgency"] == "red"
    assert decide("diarrhea", fill("diarrhea", keeps_fluids="no"))["urgency"] == "red"


def test_blood_in_stool_is_urgent_not_emergency():
    result = decide("diarrhea", fill("diarrhea", blood_stool="yes"))
    assert result["urgency"] == "yellow"
    assert "antibiotic" in " ".join(result["steps"]).lower()


def test_slow_pinch_is_urgent():
    assert decide("diarrhea", fill("diarrhea", pinch="slow"))["urgency"] == "yellow"


def test_spo2_and_indrawing_are_emergency_and_colored_phlegm_is_urgent():
    assert decide("respiratory", fill("respiratory", spo2="below_92"))["urgency"] == "red"
    assert decide("respiratory", fill("respiratory", indrawing="yes"))["urgency"] == "red"
    assert decide("respiratory", fill("respiratory", phlegm="colored"))["urgency"] == "yellow"


def test_vision_loss_is_emergency_and_high_bp_alone_is_urgent():
    assert decide("hypertension", fill("hypertension", vision="yes"))["urgency"] == "red"
    assert decide("hypertension", fill("hypertension", bp="crisis_quiet"))["urgency"] == "yellow"
    assert decide("hypertension", fill("hypertension", bp="elevated"))["urgency"] == "yellow"


def test_week_three_does_not_raise_urgency_but_is_named():
    result = decide("typhoid", fill("typhoid", illness_week="week_3"))
    assert result["urgency"] == "green"
    assert any("third week" in step.lower() for step in result["steps"])


def test_bleeding_is_emergency():
    assert decide("typhoid", fill("typhoid", bleed="yes"))["urgency"] == "red"
