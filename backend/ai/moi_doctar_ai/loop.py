"""Agentic decision loop, narrowed to one decision.

Each round asks the model for tool calls. read_decision returns the rule result. StructuredOutput is accepted
only when its urgency matches that result. The same call three times, three bad schemas, or a model failure
falls closed to the rule result. The user-facing copy never comes from
the model.
"""

from __future__ import annotations

import json

from moi_doctar_ai.rules import decide

MAX_ROUNDS = 8
STATIONARITY_STOP = 3
SCHEMA_RETRIES = 3

TOOLS = [
    {
        "name": "read_decision",
        "description": "Return the urgency and headline already computed from the approved table.",
        "parameters": {
            "type": "object",
            "properties": {"concern_id": {"type": "string"}},
            "required": ["concern_id"],
        },
    },
    {
        "name": "StructuredOutput",
        "description": "Final decision. urgency must equal read_decision.urgency.",
        "parameters": {
            "type": "object",
            "properties": {
                "concern_id": {"type": "string"},
                "urgency": {"type": "string", "enum": ["green", "yellow", "red"]},
            },
            "required": ["concern_id", "urgency"],
        },
    },
]


class ModelError(RuntimeError):
    pass


def _sig(calls):
    packed = [(call["name"], json.dumps(call.get("args") or {}, sort_keys=True)) for call in calls]
    return tuple(packed)


def _tool_result(name, args, truth):
    concern_id = args.get("concern_id")
    if concern_id != truth["concern_id"]:
        return {"error": "concern_id does not match this assessment", "urgency": truth["urgency"]}
    if name == "read_decision":
        return {
            "concern_id": truth["concern_id"],
            "urgency": truth["urgency"],
            "headline": truth["headline"],
            "reasons": truth["reasons"],
        }
    return {"error": f"unknown tool {name}"}


def _valid_structured(args, truth):
    if args.get("concern_id") != truth["concern_id"]:
        return "concern_id does not match this assessment"
    if args.get("urgency") != truth["urgency"]:
        return f"urgency must be {truth['urgency']}"
    return None


def agent_decide(concern_id, answers, model):
    truth = decide(concern_id, answers)
    if model is None:
        truth["source"] = "rule_fallback"
        return truth

    contents = [
        {
            "role": "user",
            "parts": [
                {
                    "text": (
                        "Decide the urgency for this completed assessment. "
                        "Call read_decision, then StructuredOutput. "
                        "StructuredOutput.urgency must equal read_decision.urgency. "
                        "Do not write a milder level.\n"
                        f"concern_id: {concern_id}\n"
                        f"answers: {json.dumps(answers, sort_keys=True)}"
                    )
                }
            ],
        }
    ]
    last_sig = None
    run_len = 0
    schema_misses = 0

    for round_index in range(1, MAX_ROUNDS + 1):
        try:
            parts = model.generate(contents, TOOLS)
        except ModelError:
            truth["source"] = "rule_fallback"
            truth["rounds"] = round_index - 1
            return truth

        calls = [part for part in parts if part.get("name")]
        contents.append({"role": "model", "parts": _model_parts(parts)})
        if not calls:
            contents.append(
                {
                    "role": "user",
                    "parts": [{"text": "Call read_decision. Do not answer in prose."}],
                }
            )
            continue

        signature = _sig(calls)
        run_len = run_len + 1 if signature == last_sig else 1
        last_sig = signature
        if run_len >= STATIONARITY_STOP:
            truth["source"] = "rule_fallback"
            truth["rounds"] = round_index
            return truth

        real = [call for call in calls if call["name"] != "StructuredOutput"]
        structured = [call for call in calls if call["name"] == "StructuredOutput"]
        if real:
            contents.append(
                {
                    "role": "user",
                    "parts": [
                        {
                            "functionResponse": {
                                "name": call["name"],
                                "response": _tool_result(call["name"], call.get("args") or {}, truth),
                            }
                        }
                        for call in real
                    ],
                }
            )
            continue

        error = _valid_structured(structured[0].get("args") or {}, truth)
        if error is None:
            truth["source"] = "agent"
            truth["rounds"] = round_index
            return truth
        schema_misses += 1
        if schema_misses >= SCHEMA_RETRIES:
            truth["source"] = "rule_fallback"
            truth["rounds"] = round_index
            return truth
        contents.append(
            {
                "role": "user",
                "parts": [
                    {
                        "functionResponse": {
                            "name": "StructuredOutput",
                            "response": {"error": error, "urgency": truth["urgency"]},
                        }
                    }
                ],
            }
        )

    truth["source"] = "rule_fallback"
    truth["rounds"] = MAX_ROUNDS
    return truth


def _model_parts(parts):
    rendered = []
    for part in parts:
        if part.get("name"):
            rendered.append({"functionCall": {"name": part["name"], "args": part.get("args") or {}}})
        elif part.get("text"):
            rendered.append({"text": part["text"]})
    return rendered or [{"text": ""}]
