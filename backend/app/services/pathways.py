"""Approved question flows, age profile routing and the under-6 pathway.

What the documents ask for, and where it lives here:

  Handoff 2/10    "Assessment questions come from approved flows."
                  -> the four reviewed tables in backend/ai/moi_doctar_ai
                     (typhoid, respiratory, hypertension, diarrhoea), asked one
                     question at a time; urgency from moi_doctar_ai.decide().
  Addendum 2/4    Collect age, route Adult / Pediatric 6+ / Under 6, and show
                  the profile to the user.
  Addendum 5      A child under 6 is not a routine case: check danger and
                  dehydration signs, escalate on any, otherwise advise
                  qualified medical review.

The server keeps no conversation state. Each answer carries a small `flow`
object the client sends back; everything in it is re-checked against the
approved package (unknown concern, question or option ids are ignored), so a
client cannot choose its own urgency.

Anything outside the four approved tables goes to the model-led assessment
("free" stage), which keeps the handoff's 5-question limit.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from moi_doctar_ai.pack_data import CONCERNS, LEVELS as PACK_LEVELS
from moi_doctar_ai.rules import decide as pack_decide

PATHWAYS_VERSION = "pathways-2026-09-26.1 (draft, pending health review)"

# ── age profile (addendum section 4) ───────────────────────────────────────

BANDS = {
    "under_6": "Under 6",
    "pediatric_6_plus": "Pediatric 6+",
    "adult": "Adult",
}
ADULT_FROM_YEARS = 18  # the documents name the three profiles but not this cut-off; reviewer to confirm


def band_for_age(years: Optional[float], months: Optional[float] = None) -> Optional[str]:
    if years is None and months is None:
        return None
    total_years = (years or 0) + (months or 0) / 12.0
    if total_years < 0 or total_years > 125:
        return None
    if total_years < 6:
        return "under_6"
    if total_years < ADULT_FROM_YEARS:
        return "pediatric_6_plus"
    return "adult"


def _num(v: Any) -> Optional[float]:
    try:
        f = float(v)
        return f if f == f else None
    except (TypeError, ValueError):
        return None


def patient_from_context(context: Dict[str, Any]) -> Dict[str, Any]:
    """Who the check is for, from the triage screen's profile card or the user's own profile."""
    raw = context.get("patient") if isinstance(context.get("patient"), dict) else {}
    who = str(raw.get("for") or "self").lower()
    years, months = _num(raw.get("age_years")), _num(raw.get("age_months"))
    if who == "self" and years is None and months is None:
        prof = context.get("profile") if isinstance(context.get("profile"), dict) else {}
        years = _num(prof.get("age"))
    weight = _num(raw.get("weight_kg"))
    pregnant = str(raw.get("pregnant") or "").lower() or None
    return {
        "for": who if who in ("self", "child", "other") else "self",
        "age_years": years,
        "age_months": months,
        "weight_kg": weight if weight and 0 < weight < 400 else None,
        "pregnant": pregnant if pregnant in ("yes", "no", "not_sure") else None,
        "band": band_for_age(years, months),
    }


AGE_QUESTION = {
    "id": "profile.age_band",
    "text": "How old is the person who is unwell?",
    "options": [
        ("Baby under 6 months", "under_6"),
        ("Child 6 months to 5 years", "under_6"),
        ("Child 6 to 17 years", "pediatric_6_plus"),
        ("Adult, 18 or older", "adult"),
    ],
}

# ── under-6 pathway (addendum section 5 and matrix section 3) ──────────────
# Each check comes from the addendum's list. Levels follow its instruction
# "if a warning sign is present -> emergency or urgent escalation": signs that
# are also handoff red flags are EMERGENCY, the rest URGENT.

UNDER6_CHECKS = [
    {"id": "u6.drink", "text": "Is your child drinking or breastfeeding?",
     "options": [("Yes, normally", None), ("Less than usual", "URGENT"),
                 ("No, cannot drink or breastfeed", "EMERGENCY")]},
    {"id": "u6.alert", "text": "Is your child unusually sleepy, hard to wake, confused, or breathing with difficulty?",
     "options": [("No", None), ("Yes", "EMERGENCY"), ("Not sure", "URGENT")]},
    {"id": "u6.urine", "text": "Has your child passed urine or had a wet nappy in the last 6 hours?",
     "options": [("Yes", None), ("No", "URGENT"), ("Not sure", "URGENT")]},
    {"id": "u6.signs", "text": ("Any of these: vomiting again and again, blood or black stool, very dry mouth or "
                                "no tears, sunken eyes, or bad tummy pain?"),
     "options": [("None of these", None), ("Yes, one or more", "URGENT")]},
]
UNDER6_REVIEW_STEPS = [
    "Have a health worker check your child, even if these signs are not there.",
    "Keep offering breast milk or clean fluids in small sips.",
    "Go to a clinic at once if your child stops drinking, gets very sleepy, or gets worse.",
]

# ── approved concerns ──────────────────────────────────────────────────────

_PACK = {c["id"]: c for c in CONCERNS}
CONCERN_OPTIONS = [
    ("Fever that has lasted several days", "typhoid"),
    ("Cough, catarrh, or trouble breathing", "respiratory"),
    ("High blood pressure", "hypertension"),
    ("Loose or watery stools", "diarrhea"),
    ("Something else", "other"),
]
_CONCERN_WORDS = {
    "typhoid": [r"typhoid", r"fever (for|since) (\w+ )?(days|a week|weeks)", r"fever wey no (gree )?go",
                r"fever (that )?(keeps|keep) (coming|going)", r"enteric"],
    "respiratory": [r"cough", r"catarrh", r"\bcold\b", r"\bflu\b", r"breath", r"wheez", r"chest (is )?tight",
                    r"phlegm", r"mucus", r"runny nose", r"pneumonia", r"sore throat"],
    "hypertension": [r"blood pressure", r"\bb\.?p\b", r"hypertension", r"high blood", r"\bhbp\b"],
    "diarrhea": [r"diarrh", r"loose stool", r"watery stool", r"running stomach", r"stooling", r"purging",
                 r"dey stool", r"belle (dey )?run", r"cholera", r"rice[- ]?water", r"frequent stool"],
}
_CONCERN_RE = {k: [re.compile(p) for p in v] for k, v in _CONCERN_WORDS.items() if v}

TO_LEVEL = {"red": "EMERGENCY", "yellow": "URGENT", "green": "SELF_CARE"}
_ORDER = {"EMERGENCY": 1, "URGENT": 2, "SOON": 3, "SELF_CARE": 4, "INSUFFICIENT_INFORMATION": 5}


def detect_concerns(text: str) -> List[str]:
    t = (text or "").lower()
    return [cid for cid, pats in _CONCERN_RE.items() if any(p.search(t) for p in pats)]


def _pack_questions(concern_id: str) -> List[Dict[str, Any]]:
    """Safety-critical questions first, then the body areas, so a red answer stops early."""
    qs = _PACK[concern_id]["questions"]
    return [q for q in qs if q.get("kind") == "critical"] + [q for q in qs if q.get("kind") != "critical"]


# ── the step machine ───────────────────────────────────────────────────────

def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9%/ ]+", "", (s or "").lower()).strip()


def _match(answer: str, options: List[str]) -> Optional[int]:
    a = _norm(answer)
    if not a:
        return None
    for i, o in enumerate(options):
        if _norm(o) == a:
            return i
    starts = [i for i, o in enumerate(options) if _norm(o).startswith(a) or a.startswith(_norm(o))]
    return starts[0] if len(starts) == 1 else None


_WORDNUM = {"one": 1, "a": 1, "an": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
            "eight": 8, "nine": 9, "ten": 10, "few": 3, "couple": 2, "several": 4}
_UNIT_DAYS = {"hour": 1 / 24, "day": 1, "night": 1, "week": 7, "month": 30}
_DURATION = re.compile(r"\b(\d+(?:\.\d+)?|one|a|an|two|three|four|five|six|seven|eight|nine|ten|few|couple|several)"
                       r"\s*(?:of\s+)?(hour|day|night|week|month)s?\b")
_YES = re.compile(r"^(yes|yeah|yea|yep|yup|y|sure|correct|true|e dey|i dey|it is|he is|she is|dem dey|na so)\b")
_NO = re.compile(r"^(no|nope|nah|n|not really|never|none|e no dey|i no|no be so|nothing)\b")
_UNSURE = re.compile(r"^(not sure|dont know|don't know|i don't know|i dont know|no idea|unsure|maybe|i no know)\b")

# Set by triage_service: (answer, question_text, options) -> option index or None. Model-backed,
# so a typed answer in any wording can still land on an approved option.
classifier = None


def _duration_days(text: str) -> Optional[float]:
    t = (text or "").lower()
    if re.search(r"\b(today|this morning|this afternoon|tonight|since morning|just now|few hours)\b", t):
        return 0.5
    if re.search(r"\b(yesterday|last night)\b", t):
        return 1
    m = _DURATION.search(t)
    if not m:
        return None
    n = m.group(1)
    count = float(n) if n[0].isdigit() else _WORDNUM.get(n, 1)
    return count * _UNIT_DAYS[m.group(2)]


def _duration_option(days: float, options: List[str]) -> Optional[int]:
    """Map a stated duration onto options written as week buckets."""
    lows = [o.lower() for o in options]
    if not all("week" in o for o in lows):
        return None
    if days <= 10:
        target = next((i for i, o in enumerate(lows) if "or less" in o or "a week" in o), None)
    elif days <= 17:
        target = next((i for i, o in enumerate(lows) if "two" in o or "2" in o), None)
    else:
        target = next((i for i, o in enumerate(lows) if "or more" in o or "three" in o), None)
    return target


def match_answer(answer: str, options: List[str], question_text: str = "") -> Optional[int]:
    """A tapped option, or a typed reply mapped onto one. None when it cannot be placed safely."""
    i = _match(answer, options)
    if i is not None:
        return i
    a = _norm(answer)
    lows = [_norm(o) for o in options]
    for pat, word in ((_UNSURE, ("not sure", "i do not", "unknown")), (_NO, ("no",)), (_YES, ("yes",))):
        if pat.search(a):
            hits = [k for k, o in enumerate(lows) if any(re.match(rf"{w}\b", o) for w in word)]
            if len(hits) == 1:
                return hits[0]
    days = _duration_days(answer)
    if days is not None:
        k = _duration_option(days, options)
        if k is not None:
            return k
    if classifier is not None:
        try:
            k = classifier(answer, question_text, options)
        except Exception:  # noqa: BLE001 - a failed lookup just re-asks
            k = None
        if isinstance(k, int) and 0 <= k < len(options):
            return k
    return None


NOT_MATCHED = "I couldn't match that to one of the answers. Please tap the one closest to what you mean."


def question(qid: str, text: str, options: List[str]) -> Dict[str, Any]:
    return {"id": qid, "text": text, "type": "single_choice", "options": options, "required": True}


def clean_flow(raw: Any) -> Dict[str, Any]:
    """Keep only ids that exist in the approved package."""
    f = raw if isinstance(raw, dict) else {}
    concern = f.get("concern") if f.get("concern") in _PACK else None
    answers = {}
    if concern and isinstance(f.get("answers"), dict):
        valid = {q["id"]: {o["id"] for o in q["options"]} for q in _PACK[concern]["questions"]}
        answers = {k: v for k, v in f["answers"].items() if k in valid and v in valid[k]}
    u6 = {}
    if isinstance(f.get("u6"), dict):
        ids = {c["id"]: len(c["options"]) for c in UNDER6_CHECKS}
        u6 = {k: int(v) for k, v in f["u6"].items() if k in ids and isinstance(v, int) and 0 <= v < ids[k]}
    stage = f.get("stage") if f.get("stage") in ("free",) else None
    band = f.get("band") if f.get("band") in BANDS else None
    return {"band": band, "concern": concern, "answers": answers, "u6": u6, "stage": stage,
            "pending": str(f.get("pending") or "") or None,
            "free_asked": int(f.get("free_asked") or 0) if str(f.get("free_asked") or "0").isdigit() else 0}


def step(flow: Dict[str, Any], patient: Dict[str, Any], answer: str, all_text: str) -> Tuple[str, Dict[str, Any]]:
    """Advance one turn. Returns (kind, payload):

      ("ask", {"question": {...}, "summary": str, "flow": flow})
      ("result", {"urgency": LEVEL, "reasons": [...], "steps": [...], "table": str|None, "flow": flow})
      ("free", {"flow": flow})            -> model-led assessment
    """
    pending = flow.get("pending")
    missed = False

    # 1. Age profile. A profile card value wins; otherwise ask once.
    if patient.get("band"):
        flow["band"] = patient["band"]
    if pending == AGE_QUESTION["id"]:
        i = match_answer(answer, [o[0] for o in AGE_QUESTION["options"]], AGE_QUESTION["text"])
        missed = i is None
        if i is not None:
            flow["band"] = AGE_QUESTION["options"][i][1]
    if not flow.get("band"):
        flow["pending"] = AGE_QUESTION["id"]
        return "ask", {"question": question(AGE_QUESTION["id"], AGE_QUESTION["text"],
                                            [o[0] for o in AGE_QUESTION["options"]]),
                       "summary": NOT_MATCHED if missed else "Before I guide you, one quick question.", "flow": flow}

    # 2. Under 6: danger and dehydration checks, then professional review.
    if flow["band"] == "under_6":
        if pending and pending.startswith("u6."):
            check = next(c for c in UNDER6_CHECKS if c["id"] == pending)
            i = match_answer(answer, [o[0] for o in check["options"]], check["text"])
            missed = i is None
            if i is not None:
                flow["u6"][pending] = i
        worst, reasons = "SOON", []
        for c in UNDER6_CHECKS:
            if c["id"] in flow["u6"]:
                label, level = c["options"][flow["u6"][c["id"]]]
                if level:
                    reasons.append(c["text"].rstrip("?") + f": {label}")
                    if _ORDER[level] < _ORDER[worst]:
                        worst = level
        if worst == "EMERGENCY":
            flow["pending"] = None
            return "result", {"urgency": "EMERGENCY", "reasons": reasons, "steps": [], "table": None,
                              "pathway": "under_6", "flow": flow}
        for c in UNDER6_CHECKS:
            if c["id"] not in flow["u6"]:
                flow["pending"] = c["id"]
                return "ask", {"question": question(c["id"], c["text"], [o[0] for o in c["options"]]),
                               "summary": NOT_MATCHED if missed else
                               "Because this is a young child, I will check a few important signs.",
                               "flow": flow}
        flow["pending"] = None
        return "result", {"urgency": worst, "reasons": reasons,
                          "steps": UNDER6_REVIEW_STEPS if worst == "SOON" else [],
                          "table": None, "pathway": "under_6", "flow": flow}

    # 3. Model-led assessment for concerns outside the approved tables.
    if flow.get("stage") == "free":
        return "free", {"flow": flow}

    # 4. Which approved table?
    if pending == "concern":
        i = match_answer(answer, [o[0] for o in CONCERN_OPTIONS], "Which is closest to what is worrying you most?")
        if i is not None:
            chosen = CONCERN_OPTIONS[i][1]
            if chosen == "other":
                flow["stage"], flow["pending"] = "free", None
                return "free", {"flow": flow}
            flow["concern"] = chosen
    if not flow.get("concern"):
        found = detect_concerns(all_text)
        if len(found) == 1:
            flow["concern"] = found[0]
        else:
            opts = [o for o in CONCERN_OPTIONS if o[1] in found or o[1] == "other"] if found else CONCERN_OPTIONS
            flow["pending"] = "concern"
            return "ask", {"question": question("concern", "Which is closest to what is worrying you most?",
                                                [o[0] for o in opts]),
                           "summary": "Thanks for telling me.", "flow": flow}

    # 5. The approved table, one question at a time; a red answer stops.
    concern = flow["concern"]
    qs = _pack_questions(concern)
    if pending and pending.startswith(concern + "."):
        qid = pending.split(".", 1)[1]
        q = next((x for x in qs if x["id"] == qid), None)
        if q:
            i = match_answer(answer, [o["text"] for o in q["options"]], q["prompt"])
            missed = i is None
            if i is not None:
                flow["answers"][qid] = q["options"][i]["id"]
    red = [q for q in qs if q["id"] in flow["answers"]
           and next(o for o in q["options"] if o["id"] == flow["answers"][q["id"]])["level"] == "red"]
    if red:
        flow["pending"] = None
        texts = [next(o for o in q["options"] if o["id"] == flow["answers"][q["id"]])["text"] for q in red]
        return "result", {"urgency": "EMERGENCY", "reasons": texts, "steps": [],
                          "table": _PACK[concern]["table"], "pathway": concern, "flow": flow}
    for q in qs:
        if q["id"] not in flow["answers"]:
            flow["pending"] = f"{concern}.{q['id']}"
            n = len(flow["answers"]) + 1
            return "ask", {"question": question(flow["pending"], q["prompt"], [o["text"] for o in q["options"]]),
                           "summary": NOT_MATCHED if missed else f"Question {n} of {len(qs)}.", "flow": flow}
    out = pack_decide(concern, flow["answers"])
    flow["pending"] = None
    level = TO_LEVEL[out["urgency"]]
    skip = {PACK_LEVELS[out["urgency"]]["summary"], out["disclaimer"]}
    steps = [s for s in out["steps"] if s not in skip]
    return "result", {"urgency": level, "reasons": out["reasons"], "steps": steps,
                      "table": out["table"], "pathway": concern, "flow": flow}


def profile_view(flow: Dict[str, Any], patient: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """What the result screen shows so the user can see which profile was used (addendum 4)."""
    band = flow.get("band")
    if not band:
        return None
    age = None
    if patient.get("age_years") is not None or patient.get("age_months") is not None:
        y, m = int(patient.get("age_years") or 0), int(patient.get("age_months") or 0)
        age = f"{y} y" + (f" {m} m" if m else "") if y else f"{m} months"
    return {"band": band, "label": BANDS[band], "age": age, "weight_kg": patient.get("weight_kg"),
            "for": patient.get("for")}
