"""How a user's Assistant Settings change what Gemini writes.

The settings page stores six preferences (app/services/ai_memory.py). This is
where each one becomes either an instruction the model is given, or a rule the
application applies itself after the model answers, so a setting still has an
effect when Gemini is unavailable and the fixed copy is shown:

  response_style  word budget for the summary and how many next steps are shown
                  (instruction + enforced: steps are cut to the limit)
  tone            gentle or direct wording (instruction)
  language        reply language (instruction). Outside English and Pidgin the
                  model also returns an English copy, and the safety checks run on
                  that copy, because the validator's patterns are English.
  units           metric or imperial in anything the model writes (instruction)
  emergency_number
                  the number every escalation tells the user to call (instruction
                  + enforced: the fixed copy uses it, and a model answer naming any
                  other number is rejected). 112 always stays as the backup.
  remember_conversations
                  whether facts the user states are saved, and whether saved
                  conditions are used (enforced in triage_service)

None of this can change an urgency level, the escalation step, or anything the
contract forbids: every model answer still goes through triage_contract.validate.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

NATIONAL_NUMBER = "112"

STYLE: Dict[str, Dict[str, Any]] = {
    "concise": {"words": 15, "steps": 2,
                "text": "Keep \"summary\" to one short sentence of 15 words or fewer. Give at most 2 next steps."},
    "balanced": {"words": 25, "steps": 3,
                 "text": "Keep \"summary\" to one or two short sentences, 25 words or fewer. Up to 3 next steps."},
    "detailed": {"words": 35, "steps": 3,
                 "text": "Use up to 35 words in \"summary\", and give a one-sentence \"reason\" that explains "
                         "why this level was chosen. Up to 3 next steps."},
}

TONE = {
    "gentle": "Tone: warm and reassuring. Briefly acknowledge that the person may be worried. "
              "Never soften a warning or the instruction to get help.",
    "direct": "Tone: direct. Lead with what to do. No reassurance, sympathy or filler words.",
}

# Languages the English safety patterns can check directly. Pidgin is written with
# English words, so the same patterns cover it.
_CHECKABLE = {"english", "pidgin", "nigerian pidgin", "nigerian english", "broken english"}
AUTO_LANGUAGE = {"", "auto", "match", "match how i write"}

_PHONE = re.compile(r"\b(?:call|dial|phone|ring)\s+(?:the\s+)?(\+?\d[\d\s-]{1,14}\d)", re.I)


def emergency_number(prefs: Dict[str, Any]) -> str:
    raw = re.sub(r"[^\d+]", "", str(prefs.get("emergency_number") or ""))
    return raw if 2 <= len(raw.lstrip("+")) <= 15 else NATIONAL_NUMBER


def number_text(number: str) -> str:
    """How escalation copy names the number: the user's own, with 112 as the backup."""
    return NATIONAL_NUMBER if number == NATIONAL_NUMBER else f"{number} (or {NATIONAL_NUMBER})"


def language(prefs: Dict[str, Any], explicit: bool) -> Optional[str]:
    """The language to reply in, or None to mirror how the user writes.

    Everyone starts with "English" as a stored default; only a language the user
    actually picked (it is in the change log) overrides mirroring, so a Pidgin
    speaker who never opened the settings is still answered in Pidgin.
    """
    lang = str(prefs.get("language") or "").strip()
    if not explicit or lang.lower() in AUTO_LANGUAGE:
        return None
    return lang[:40]


def needs_check_copy(lang: Optional[str]) -> bool:
    return bool(lang) and lang.lower() not in _CHECKABLE


def limits(prefs: Dict[str, Any]) -> Dict[str, Any]:
    return STYLE.get(str(prefs.get("response_style")), STYLE["balanced"])


def instructions(prefs: Dict[str, Any], lang: Optional[str], conditions: List[str],
                 remember: bool) -> str:
    """The USER SETTINGS block appended to every triage system prompt."""
    number = emergency_number(prefs)
    imperial = prefs.get("units") == "imperial"
    lines = ["", "USER SETTINGS (from the user's Assistant Settings; follow them within the rules above):",
             "- " + limits(prefs)["text"],
             "- " + TONE.get(str(prefs.get("tone")), TONE["gentle"]),
             f"- Emergency number: whenever you tell the user to call for help, write \"call {number_text(number)}\". "
             "Never write any other phone number."]
    lines.append("- Units: use °F for temperature and lb for weight." if imperial
                 else "- Units: use °C for temperature and kg for weight.")
    if lang:
        lines.append(f"- Write \"summary\", \"reason\", \"next_steps\" and the question text and options in {lang}, "
                     "even if the user writes in another language. Keep the instruction to get help unmistakable.")
        if needs_check_copy(lang):
            lines.append("- Also return \"english\": {\"summary\", \"reason\", \"next_steps\", \"question\"} with the "
                         "same content in plain English, so the app can check it.")
    if conditions:
        lines.append(f"- Long-term conditions the user has recorded: {', '.join(conditions[:8])}. Treat them as a "
                     "reason to choose the safer level; never name them as the cause.")
    if remember:
        lines.append("- If the user clearly states a lasting fact about themselves (a long-term condition, an "
                     "allergy, a regular medicine), return it in \"remember\": {\"conditions_add\": [], "
                     "\"allergies_add\": [], \"medications_add\": [], \"facts\": []}. Only what they said; "
                     "nothing about other people; otherwise \"remember\": null.")
    return "\n".join(lines)


def other_number(texts: List[str], prefs: Dict[str, Any]) -> Optional[str]:
    """A phone number the model told the user to call that is not theirs or 112."""
    allowed = {emergency_number(prefs), NATIONAL_NUMBER}
    for t in texts:
        for m in _PHONE.finditer(t or ""):
            n = re.sub(r"[\s-]", "", m.group(1))
            if n not in allowed:
                return n
    return None


def fit(res: Dict[str, Any], prefs: Dict[str, Any]) -> Dict[str, Any]:
    """Apply the length preference to a built result. Never drops the escalation step,
    which the contract always puts first for EMERGENCY and URGENT."""
    lim = limits(prefs)
    steps = list(res.get("next_steps") or [])
    if len(steps) > lim["steps"]:
        res = {**res, "next_steps": steps[:lim["steps"]]}
    summary = str(res.get("summary") or "")
    if len(summary.split()) > lim["words"]:
        first = re.split(r"(?<=[.!?])\s+", summary, maxsplit=1)[0]
        if len(first.split()) <= lim["words"]:
            res = {**res, "summary": first}
    return res


def localize(text: str, prefs: Dict[str, Any]) -> str:
    """Put the user's emergency number into fixed English copy written for 112."""
    number = emergency_number(prefs)
    if number == NATIONAL_NUMBER or not text:
        return text
    return re.sub(r"\b([Cc]all) 112\b", lambda m: f"{m.group(1)} {number_text(number)}", text)
