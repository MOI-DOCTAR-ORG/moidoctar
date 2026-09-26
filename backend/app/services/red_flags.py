"""Deterministic red-flag rules for triage.

The handoff's core decision: the application's approved rules detect emergency
red flags and set urgency; Gemini only explains. This module is that rule
layer. It reads the user's own words (English and Nigerian Pidgin) and returns
which approved flags are present, before and regardless of any model call.

Two tiers:
  EMERGENCY_FLAGS  the handoff's starter list (section 6). Any hit forces
                   EMERGENCY and stops routine questioning.
  URGENT_SIGNS     warning signs from the paediatric/OTC addendum (sections
                   3 and 5) that the documents route to "emergency or urgent"
                   escalation. Any hit sets a floor of URGENT.

Negation matters: "no chest pain and no trouble breathing" must not read as
chest pain. A phrase is ignored when a negation word sits just before it in the
same clause. Phrases whose meaning *is* a negation ("can't breathe", Pidgin
"e no gree drink") carry it inside the pattern, so they still match.

STATUS: starter list pending health-reviewer approval (handoff section 1).
Bump RULES_VERSION whenever a pattern changes; it is logged with each result.
"""
from __future__ import annotations

import re
from typing import Dict, List, Tuple

RULES_VERSION = "redflags-2026-09-26.1 (draft, pending health review)"

# id -> patterns (regex, matched on lower-case text with word boundaries).
EMERGENCY_FLAGS: Dict[str, List[str]] = {
    "severe_breathing_difficulty": [
        r"can'?t breathe", r"cannot breathe", r"can not breathe", r"unable to breathe",
        r"struggling to breathe", r"gasping", r"difficulty breathing", r"trouble breathing",
        r"hard to breathe", r"shortness of breath", r"short of breath", r"breathing (very )?fast",
        r"no fit (catch )?breath(e)?", r"breath dey cut", r"i no (fit )?see breath",
    ],
    "unconscious_or_unresponsive": [
        r"unconscious", r"unresponsive", r"not responding", r"passed out", r"fainted",
        r"collapsed", r"(hard|difficult) to wake", r"(won'?t|can'?t|cannot|not) wak(e|ing) (up)?",
        r"no dey wake", r"e no (fit )?wake", r"don faint", r"e faint",
    ],
    "signs_of_stroke": [
        r"stroke", r"face (is )?droop", r"drooping face", r"slurred speech", r"speech (is )?slurred",
        r"one side of (my|his|her|the) (body|face)", r"(can'?t|cannot) move (my|his|her) (arm|leg|hand)",
        r"sudden(ly)? weak(ness)? (on|in) one side",
    ],
    "severe_uncontrolled_bleeding": [
        r"(severe|heavy|serious) bleeding", r"bleeding (heavily|a lot|won'?t stop|will not stop)",
        r"blood (no gree|won'?t|will not) stop", r"vomit(ing|ed|s)? blood", r"cough(ing|ed|s)? (up )?blood",
        r"dey vomit blood", r"(pregnan\w*).{0,40}bleed", r"bleed\w*.{0,40}pregnan",
    ],
    "blue_lips_or_face": [
        r"blue lips", r"lips (are |is )?(turning |turned |dey turn |don turn )?blue", r"(face|skin) (is |turning |turned )?blu(e|ish)",
        r"bluish", r"mouth (don )?turn blue",
    ],
    "severe_allergic_reaction": [
        r"anaphyla", r"(tongue|throat|lips?) (is |are )?swell", r"swollen (tongue|throat|lips?)",
        r"throat (is )?closing",
    ],
    "suicidal_immediate_danger": [
        r"suicid", r"kill (myself|my self)", r"end (my|it) (life|all)", r"want to die",
        r"i wan (kill myself|die)", r"take my (own )?life", r"overdose",
    ],
    "new_seizure": [
        r"seizure", r"convuls", r"\bfits?\b", r"dey jerk", r"shaking (and|but) not respond",
    ],
    "sudden_confusion": [
        r"(sudden(ly)?|very|now|became|becoming|is|seems|looks|getting|got) confused", r"confused and",
        r"disorient", r"not making sense", r"talking nonsense", r"e no (sabi|know) where e dey",
    ],
    "severe_dehydration": [
        r"no (urine|pee|wee)", r"(hasn'?t|has not|haven'?t|have not|didn'?t|did not) (urinate|pee|wee)d?",
        r"no wet (diaper|nappy)", r"sunken eyes", r"eyes (are )?sunken", r"no tears",
        r"very dry mouth", r"rice[- ]?water",
        r"(can'?t|cannot|unable to|won'?t|refus\w* to) (keep )?(drink|breastfeed|suck|eat or drink)",
        r"no gree (drink|suck|breastfeed|chop)", r"(can'?t|cannot) keep (any )?(fluids?|water|anything) down",
    ],
    "serious_injury": [
        r"(hit|knocked down) by (a )?(car|vehicle|okada|bike|motorcycle|keke)", r"gunshot", r"stab(bed|bing)",
        r"bone (is )?(sticking|coming) out", r"deep (cut|wound)", r"head injury", r"fell from (a )?height",
        r"(bad|serious|severe) (accident|burn)",
    ],
}

# Chest pain is an emergency with breathing difficulty (handoff) and urgent alone.
CHEST_PAIN = [r"chest pain", r"pain in (my|the) chest", r"chest (is )?(tight|tightness|heavy|pressure)",
              r"crushing chest", r"chest dey pain", r"my chest dey"]

URGENT_SIGNS: Dict[str, List[str]] = {
    "chest_pain": CHEST_PAIN,
    "blood_or_black_stool": [r"blood (in|inside) (my |his |her |the )?(stool|poo|poop|toilet)", r"bloody stool",
                             r"black stool", r"black (poo|poop)", r"stool (is |dey )?black"],
    "repeated_vomiting": [r"(keep|keeps|kept|keeping) vomiting", r"vomit(ing|ed)? (many|several|repeatedly|nonstop|non-stop)",
                          r"(can'?t|cannot) stop vomiting", r"dey vomit (well well|every)", r"vomiting (all|every)"],
    "severe_abdominal_pain": [r"(severe|serious|terrible|worst) (abdominal|stomach|belly|tummy) pain",
                              r"(stomach|belly|tummy) (pain )?(is )?(getting )?(worse|very bad)", r"belle dey pain (me )?well well"],
    "unusual_sleepiness_or_weakness": [r"(very|unusually|too) (sleepy|drowsy|weak)", r"dey sleep too much",
                                       r"sleeping too much", r"no strength", r"floppy"],
    "high_fever": [r"very high fever", r"high fever", r"body (dey )?hot (well well|too much|die)",
                   r"temperature (of |is )?(39|40|41)"],
    "caregiver_very_worried": [r"(seriously|very) (unwell|sick|ill)", r"getting worse (fast|quickly)", r"rapidly worse"],
}

_NEGATIONS = {"no", "not", "never", "without", "denies", "deny", "nor", "dont", "don't", "doesnt",
              "doesn't", "didnt", "didn't", "havent", "haven't", "hasnt", "hasn't", "isnt", "isn't",
              "neither", "none"}
_CLAUSE = re.compile(r"[.;!?\n]|,| but | however | though ")


def _compile(table: Dict[str, List[str]]) -> Dict[str, List[re.Pattern]]:
    return {k: [re.compile(r"(?<![a-z])" + p) for p in v] for k, v in table.items()}


_EMERGENCY = _compile(EMERGENCY_FLAGS)
_URGENT = _compile(URGENT_SIGNS)
_CHEST = [re.compile(r"(?<![a-z])" + p) for p in CHEST_PAIN]


def _negated(clause: str, start: int) -> bool:
    """True when a negation word sits in the 3 words before `start` in this clause."""
    before = re.findall(r"[a-z']+", clause[:start])[-3:]
    return any(w in _NEGATIONS for w in before)


def _hits(text: str, table: Dict[str, List[re.Pattern]]) -> List[str]:
    found: List[str] = []
    for clause in _CLAUSE.split(text):
        for flag, patterns in table.items():
            if flag in found:
                continue
            for p in patterns:
                m = p.search(clause)
                if m and not _negated(clause, m.start()):
                    found.append(flag)
                    break
    return found


def detect(text: str) -> Tuple[List[str], List[str]]:
    """(emergency_flags, urgent_signs) present in the user's own words."""
    t = f" {(text or '').lower()} "
    emergency = _hits(t, _EMERGENCY)
    urgent = _hits(t, _URGENT)
    if "chest_pain" in urgent and "severe_breathing_difficulty" in emergency:
        emergency.append("chest_pain_with_difficulty_breathing")
    return emergency, urgent


def chest_pain(text: str) -> bool:
    return bool(_hits(f" {(text or '').lower()} ", {"chest": _CHEST}))
