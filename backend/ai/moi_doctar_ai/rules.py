"""Deterministic urgency from the approved tables.

Red outranks yellow, yellow outranks green. The model is not allowed to
change this result. It may only confirm it.
"""

from __future__ import annotations

from moi_doctar_ai.pack_data import CONCERNS, DISCLAIMER, LEVELS

_RANK = {"none": 0, "green": 1, "yellow": 2, "red": 3}
_BY_ID = {item["id"]: item for item in CONCERNS}


class PackError(ValueError):
    pass


def concerns():
    return [
        {"id": item["id"], "name": item["name"], "blurb": item["blurb"], "table": item["table"]}
        for item in CONCERNS
    ]


def concern(concern_id):
    item = _BY_ID.get(concern_id)
    if item is None:
        raise PackError(f"unknown concern: {concern_id}")
    return item


def questions(concern_id):
    return concern(concern_id)["questions"]


def _option(question, option_id):
    for option in question["options"]:
        if option["id"] == option_id:
            return option
    raise PackError(f"unknown option {option_id} for {question['id']}")


def decide(concern_id, answers):
    """Return the approved urgency for a complete answer map.

    `answers` maps question id to option id. Every question must be present.
    """
    item = concern(concern_id)
    if not isinstance(answers, dict):
        raise PackError("answers must be an object")
    missing = [q["id"] for q in item["questions"] if q["id"] not in answers]
    if missing:
        raise PackError("missing answers: " + ", ".join(missing))

    level = "none"
    reasons = []
    notes = []
    for question in item["questions"]:
        option = _option(question, answers[question["id"]])
        if _RANK[option["level"]] > _RANK[level]:
            level = option["level"]
        if option["level"] in ("yellow", "red"):
            reasons.append(option["text"])
        if option.get("note"):
            notes.append(option["note"])

    if level == "none":
        level = "green"

    steps = [LEVELS[level]["summary"]]
    steps.extend(item["level_steps"].get(level, []))
    steps.extend(notes)
    steps.extend(item["always_steps"])
    steps.append(DISCLAIMER)

    return {
        "concern_id": concern_id,
        "table": item["table"],
        "urgency": level,
        "headline": LEVELS[level]["headline"],
        "reasons": reasons,
        "steps": steps,
        "disclaimer": DISCLAIMER,
        "source": "rules",
        "rounds": 0,
    }
