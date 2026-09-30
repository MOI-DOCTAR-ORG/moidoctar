"""The triage result contract from the AI Engineer Handoff (sections 4, 5, 7, 8).

One place for:
  - the five urgency levels and their fixed display values,
  - the fixed copy the app shows without the model (emergency, fallback,
    medication-under-review),
  - the validator every model response must pass before a user sees it,
  - the mapping onto the older response fields the current frontend reads.

Gemini supplies wording only. Anything here that decides safety (levels, copy,
limits) is application logic and must not be taken from the model.
"""
from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional

EMERGENCY_NUMBER = "112"  # Nigeria's national emergency number

LEVELS: Dict[str, Dict[str, Any]] = {
    "EMERGENCY": {"label": "Emergency", "color": "red", "icon": "emergency", "priority": 1,
                  "legacy": "Urgent", "facility_action": "nearest_emergency_department"},
    "URGENT": {"label": "Urgent", "color": "orange", "icon": "urgent", "priority": 2,
               "legacy": "Urgent", "facility_action": "urgent_care_today"},
    "SOON": {"label": "See a clinician soon", "color": "yellow", "icon": "clinic", "priority": 3,
             "legacy": "Moderate", "facility_action": "clinic_within_72_hours"},
    "SELF_CARE": {"label": "Monitor at home", "color": "green", "icon": "home", "priority": 4,
                  "legacy": "Stable", "facility_action": None},
    "INSUFFICIENT_INFORMATION": {"label": "More information needed", "color": "gray", "icon": "help",
                                 "priority": 5, "legacy": "Stable", "facility_action": None},
}
STATUSES = ("question", "complete", "emergency_stop", "redirect_off_topic")
# The Behavior spec's status names (section 11), as the model returns them, mapped onto the
# names the app and the current frontend use. "fallback" is never taken from the model: the
# app sets it itself (ai_source "rules" plus ai_notice) when the model fails.
STATUS_ALIASES = {"needs_clarification": "question", "emergency_escalation": "emergency_stop"}

# Behavior spec, section 2. Every message is classified into exactly one of these.
INTENTS = (
    "HEALTH_SYMPTOM", "MEDICATION_OR_DOSAGE", "EMERGENCY_OR_RED_FLAG", "FOLLOW_UP_ANSWER",
    "SPELLING_OR_LANGUAGE_CLARIFICATION", "APP_HELP", "GENERAL_NON_HEALTH_QUESTION",
    "IDENTITY_OR_PERSONAL_DATA", "UNCLEAR_OR_INSUFFICIENT_INFORMATION", "ABUSIVE_OR_UNSAFE_REQUEST",
)
# Intents that are answered with fixed redirect copy, never with the model's own words.
REDIRECT_INTENTS = ("GENERAL_NON_HEALTH_QUESTION", "IDENTITY_OR_PERSONAL_DATA", "ABUSIVE_OR_UNSAFE_REQUEST")

MAX_QUESTIONS = 5
MAX_STEPS = 3
# Behavior spec, section 3 ("suggested limits").
MAX_SUMMARY_WORDS = 25
MAX_REASON_WORDS = 30
MAX_STEP_WORDS = 15
MAX_QUESTION_WORDS = 20
MAX_TOTAL_WORDS = 80

# The spec lists exactly these fields. With STRICT_FIELDS on, anything else is rejected.
# `escalation`, `english` and `remember` are the app's own additions (the older escalation
# shape, the checking copy for other languages, and Assistant Settings memory).
ALLOWED_FIELDS = {"intent", "status", "urgency", "summary", "reason", "follow_up_question", "next_steps",
                  "red_flags", "escalation_required", "normalized_terms", "off_topic", "confidence",
                  "has_symptoms", "facility_action", "escalation", "english", "remember"}
STRICT_FIELDS = os.environ.get("AI_STRICT_FIELDS", "").lower() in ("1", "true", "yes")

SAFETY_NOTE = ("Moi Doctar provides guidance only and does not diagnose conditions. "
               f"In an emergency, call {EMERGENCY_NUMBER} or go to the nearest emergency department.")

# Behavior spec, section 12, verbatim.
FALLBACK_MESSAGE = ("We can't complete the AI guidance right now. If symptoms are severe or worsening, "
                    "seek urgent medical care. Otherwise, try again or contact a qualified healthcare professional.")

# Behavior spec, sections 6 and 7: short, polite, fixed redirects. Fixed so the same
# input always gets the same reply, and so the model never answers an off-topic question.
REDIRECT_COPY = {
    "GENERAL_NON_HEALTH_QUESTION": ("I can help with health concerns and using Moi Doctar. I can't help with "
                                    "general topics here. What health concern would you like help with?"),
    "IDENTITY_OR_PERSONAL_DATA": "I don't know your name yet. You can add it in your profile if you want.",
    "ABUSIVE_OR_UNSAFE_REQUEST": ("I can't help with that. If you have a health concern, tell me what you "
                                  "are feeling."),
}
IDENTITY_OTHER_COPY = ("I only know what you add to your profile or tell me in this chat. You can check it "
                       "in your profile.")
APP_HELP_COPY = "For help using Moi Doctar, open Support from the menu. What would you like to do?"
OPEN_QUESTION = {"id": "open_concern", "text": "What is your main symptom, and when did it start?",
                 "type": "short_text", "options": [], "required": True}

# Addendum section 9, verbatim.
MEDICATION_REVIEW_MESSAGE = ("Medication guidance is currently under medical review. Do not use this app to "
                             "select or change a dose. Follow instructions from a qualified healthcare professional.")

ESCALATION = {
    "EMERGENCY": "Seek emergency help now. Do not wait for symptoms to improve.",
    "URGENT": "Get medical help today. Do not wait to see if it passes.",
}

FIXED: Dict[str, Dict[str, Any]] = {
    "EMERGENCY": {
        "summary": "Your symptoms may need immediate medical attention.",
        "reason": "You reported a warning sign that should not wait.",
        "next_steps": [f"Call {EMERGENCY_NUMBER} or go to the nearest emergency department now.",
                       "Do not drive yourself if you feel faint or confused.",
                       "Stay with someone while help is coming."],
    },
    "URGENT": {
        "summary": "This needs to be checked by a health worker today.",
        "reason": "You reported a sign that should be seen quickly.",
        "next_steps": ["Go to a clinic or hospital today.",
                       "Take someone with you if you can.",
                       f"Call {EMERGENCY_NUMBER} if it gets worse on the way."],
    },
    "SOON": {
        "summary": "Please arrange to see a health worker in the next few days.",
        "reason": None,
        "next_steps": ["Book a clinic visit within 1 to 3 days.",
                       "Rest and drink clean water.",
                       "Go sooner if it gets worse or new signs appear."],
    },
    "SELF_CARE": {
        "summary": "This can usually be watched at home for now.",
        "reason": None,
        "next_steps": ["Rest and drink clean water.",
                       "Watch how you feel over the next day or two.",
                       "Get help if it gets worse or new signs appear."],
    },
    "INSUFFICIENT_INFORMATION": {
        "summary": "I need a bit more information to guide you safely.",
        "reason": None,
        "next_steps": [],
    },
}

# What the model must not do (handoff section 3 and 7, matrix section 6).
_MEDICINES = re.compile(
    r"\b(paracetamol|acetaminophen|panadol|ibuprofen|brufen|nurofen|cetirizine|zyrtec|antacid|gaviscon|"
    r"aspirin|diclofenac|amoxicillin|augmentin|ciprofloxacin|cipro|azithromycin|metronidazole|flagyl|"
    r"artemether|lumefantrine|coartem|chloroquine|antibiotic|antimalarial|ors sachet|oral rehydration salts?)\b")
_DOSE = re.compile(r"\b\d+(\.\d+)?\s?(mg|mcg|ml|g|iu|tablets?|tabs?|caplets?|capsules?|teaspoons?|drops?)\b"
                   r"|\b(twice|three times|3 times|2 times) (a|per|daily|every)")
_DIAGNOSIS = re.compile(r"\byou (have|are having|'ve got|got) (a |an )?(malaria|typhoid|cholera|pneumonia|covid|"
                        r"meningitis|appendicitis|diabetes|hypertension|infection|ulcer|asthma|tuberculosis|tb)\b"
                        r"|\bdiagnos|\bit(?:'s| is) (definitely|clearly) ")
# Handoff section 7: never invent a facility, opening hours, wait time or location.
# Matched on the original case so "the nearest hospital" passes and "Unity Hospital" does not.
_FACILITY = re.compile(r"\b(?:[A-Z][A-Za-z'.]+ ){1,4}(?:Teaching |General |Specialist |Federal |State )?"
                       r"(?:Hospital|Clinic|Medical Cent(?:er|re)|Health Cent(?:er|re)|Pharmacy|Maternity)\b"
                       r"|\b(?:LUTH|LASUTH|UCH|UNTH|ABUTH|UBTH|OAUTHC|JUTH|UITH|FMC)\b")
_HOURS = re.compile(r"\b(open|opens|opened|closes|closing)\s+(24|all day|until|till|from|at|now|daily|every)"
                    r"|\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\b24/7\b|\bopening hours?\b")
_WAIT = re.compile(r"\bwait(ing)?\s+(time|times)\b|\bwait (of |about |around |for )?\d+\s?(min|minute|hour)"
                   r"|\b\d+\s?(min|minute|hour)s? wait\b")
_ADDRESS = re.compile(r"\b\d+\s+[A-Za-z]+\s+(street|st|road|rd|avenue|ave|close|crescent|way)\b", re.I)
_SAFE_CLAIM = re.compile(r"\byou are (definitely|completely) (safe|fine)\b|\bnothing to worry about\b")
# Behavior spec, section 6: never invent the user's name or other personal data.
_PERSONAL = re.compile(r"\byour (name|age|address|phone number|email) is\b|\byou are called\b")


class InvalidResult(ValueError):
    """A model response that must be replaced with fixed copy."""


def _words(text: Optional[str]) -> int:
    return len((text or "").split())


def _clean_list(v: Any) -> List[str]:
    return [str(x).strip() for x in v if str(x).strip()] if isinstance(v, list) else []


def unsafe_text(text: str) -> Optional[str]:
    """Why a piece of model text may not be shown, or None when it may."""
    t = (text or "").lower()
    if _MEDICINES.search(t) or _DOSE.search(t):
        return "names a medicine or dose"
    if _DIAGNOSIS.search(t):
        return "states a diagnosis"
    if _SAFE_CLAIM.search(t):
        return "tells the user they are definitely safe"
    if _PERSONAL.search(t):
        return "states personal data"
    if _FACILITY.search(text or ""):
        return "names a facility"
    if _HOURS.search(t) or _WAIT.search(t) or _ADDRESS.search(text or ""):
        return "states opening hours, a wait time or an address"
    return None


def _first_sentence(text: str, limit: int) -> Optional[str]:
    """The first sentence when it fits the limit, else None."""
    first = re.split(r"(?<=[.!?])\s+", text, maxsplit=1)[0]
    return first if _words(first) <= limit else None


def validate(result: Any) -> Dict[str, Any]:
    """Handoff section 7 and Behavior spec section 11. Returns the cleaned result or raises InvalidResult."""
    if not isinstance(result, dict):
        raise InvalidResult("not a JSON object")
    if STRICT_FIELDS:
        unknown = set(result) - ALLOWED_FIELDS
        if unknown:
            raise InvalidResult(f"unknown fields {sorted(unknown)}")
    urgency = str(result.get("urgency") or "").strip().upper()
    if urgency not in LEVELS:
        raise InvalidResult(f"invalid urgency level {urgency!r}")
    status = str(result.get("status") or "").strip().lower()
    status = STATUS_ALIASES.get(status, status)
    if status not in STATUSES:
        raise InvalidResult(f"invalid status {status!r}")
    intent = str(result.get("intent") or "").strip().upper() or None
    if intent and intent not in INTENTS:
        raise InvalidResult(f"invalid intent {intent!r}")
    steps = result.get("next_steps")
    if steps is None:
        steps = []
    if not isinstance(steps, list) or len(steps) > MAX_STEPS:
        raise InvalidResult("too many next steps")
    steps = _clean_list(steps)
    if any(_words(x) > MAX_STEP_WORDS for x in steps):
        raise InvalidResult("a next step is too long")
    summary = str(result.get("summary") or "").strip()
    if _words(summary) > MAX_SUMMARY_WORDS:
        summary = _first_sentence(summary, MAX_SUMMARY_WORDS) or ""
        if not summary:
            raise InvalidResult("summary is too long")
    reason = result.get("reason")
    reason = str(reason).strip() if reason else None
    if reason and _words(reason) > MAX_REASON_WORDS:
        reason = None  # supporting text only: dropped rather than shown long
    # The spec's flat `escalation_required`, or the older {"escalation": {"required": ...}}.
    escalation = result.get("escalation") if isinstance(result.get("escalation"), dict) else {}
    escalate = result.get("escalation_required", escalation.get("required"))
    if urgency == "EMERGENCY" and escalate is not True:
        raise InvalidResult("emergency escalation is missing")
    question = result.get("follow_up_question")
    if isinstance(question, str):
        question = {"text": question} if question.strip() else None
    if status == "question":
        if not isinstance(question, dict) or not str(question.get("text") or "").strip():
            raise InvalidResult("question status without a question")
        question = {
            "id": str(question.get("id") or "q").strip()[:60],
            "text": str(question.get("text")).strip(),
            "type": "single_choice" if question.get("options") else "short_text",
            "options": _clean_list(question.get("options"))[:6],
            "required": True,
        }
        if _words(question["text"]) > MAX_QUESTION_WORDS:
            raise InvalidResult("question is too long")
    else:
        question = None
    total = lambda: sum(_words(x) for x in [summary, reason or "", *steps, question["text"] if question else ""])  # noqa: E731
    if total() > MAX_TOTAL_WORDS:
        reason = None
        if total() > MAX_TOTAL_WORDS:
            raise InvalidResult("response is too long")
    for text in [summary, reason or "", *steps, question["text"] if question else ""]:
        why = unsafe_text(text)
        if why:
            raise InvalidResult(f"text {why}")
    terms = [t[:60] for t in _clean_list(result.get("normalized_terms"))[:6]]
    try:
        confidence = float(result.get("confidence"))
        confidence = round(min(max(confidence, 0.0), 1.0), 2) if confidence == confidence else None
    except (TypeError, ValueError):
        confidence = None
    return {
        "status": status,
        "urgency": urgency,
        "summary": summary,
        "reason": reason,
        "next_steps": steps,
        "follow_up_question": question,
        "has_symptoms": bool(result.get("has_symptoms", True)),
        "intent": intent,
        "normalized_terms": terms,
        "off_topic": result.get("off_topic") is True or intent in REDIRECT_INTENTS,
        "confidence": confidence,
    }


def build(urgency: str, *, status: str, summary: Optional[str] = None, reason: Optional[str] = None,
          next_steps: Optional[List[str]] = None, question: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """A full contract result. Level-dependent fields always come from LEVELS, never the model."""
    lvl = LEVELS[urgency]
    fixed = FIXED[urgency]
    escalate = urgency in ESCALATION
    return {
        "status": status,
        "urgency": urgency,
        "indicator": {k: lvl[k] for k in ("label", "color", "icon", "priority")},
        "summary": summary or fixed["summary"],
        "reason": reason if reason is not None else fixed["reason"],
        "next_steps": list(next_steps if next_steps is not None else fixed["next_steps"])[:MAX_STEPS],
        "escalation": {"required": escalate, "message": ESCALATION.get(urgency)},
        "facility_action": lvl["facility_action"],
        "follow_up_question": question,
        "safety_note": SAFETY_NOTE,
    }


def redirect(intent: str, account_name: Optional[str] = None, asks_name: bool = True) -> Dict[str, Any]:
    """Fixed reply for a message that is not a health concern (Behavior spec, sections 6 and 7)."""
    if intent == "IDENTITY_OR_PERSONAL_DATA":
        if not asks_name:
            summary = IDENTITY_OTHER_COPY
        elif account_name:
            summary = f"Your profile name is {account_name}. You can change it in your profile."
        else:
            summary = REDIRECT_COPY[intent]
    else:
        summary = REDIRECT_COPY.get(intent, REDIRECT_COPY["GENERAL_NON_HEALTH_QUESTION"])
    return build("INSUFFICIENT_INFORMATION", status="redirect_off_topic", summary=summary, next_steps=[])


def legacy_fields(res: Dict[str, Any]) -> Dict[str, Any]:
    """Map the contract onto the fields the current frontend and history rows read."""
    urgency = res["urgency"]
    q = res.get("follow_up_question")
    reply = res["summary"] + (f" {q['text']}" if q else "")
    watch = [res["escalation"]["message"]] if res["escalation"]["message"] else (
        ["Get help if it gets worse or new signs appear."] if urgency in ("SOON", "SELF_CARE") else [])
    return {
        "urgency_level": LEVELS[urgency]["legacy"],
        "needs_more_info": res["status"] == "question",
        "rationale": res.get("reason") or res["summary"],
        "reply": reply,
        # Removed on purpose: the handoff forbids diagnosis, so no condition names.
        "possible_conditions": [],
        "care_plan": {"immediate_relief": res["next_steps"], "food_and_water": [], "when_to_hospital": watch},
        "recommended_actions": res["next_steps"],
        "red_flags_to_watch": watch,
        "follow_up_questions": [q["text"]] if q else [],
        "disclaimer": SAFETY_NOTE,
    }
