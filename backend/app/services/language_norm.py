"""Local reading of informal words, before any model call (Behavior spec, section 4).

Users write "bumbum pain", "my belle dey pain me", "paracetemol". This module
turns the common ones into plain terms so that:
  - the model is told what the app already understood (it still confirms when unsure),
  - the medication gate recognises a misspelt medicine name,
  - the router can tell a health message from an identity question or a blank one.

It never changes the user's words and never decides urgency: red flags stay in
red_flags.py. A term that could change medical safety when misread is marked
ambiguous so the model asks one clarifying question instead of guessing.
"""
from __future__ import annotations

import difflib
import re
from typing import Dict, List, Optional, Tuple

# (pattern, plain term, ambiguous). Matched on lower-case text.
_PHRASES: List[Tuple[str, str, bool]] = [
    (r"\bbum ?bum\b|\bnyash\b|\byansh\b|\bbackside\b", "pain around the buttocks or bottom", False),
    (r"\bbelle\b.{0,20}\bpain\b|\bpain\b.{0,10}\bbelle\b|\bbelle dey (turn|do me)\b", "stomach or abdominal pain", True),
    (r"\bhead (dey|is) (burst|bursting|bang|banging|split|splitting)\b", "severe headache", False),
    (r"\bhead dey (pain|do me)\b", "headache", False),
    (r"\b(dey|i) purge\b|\bpurging\b|\bpurge\b|\brunning stomach\b|\bbelle dey run\b", "diarrhoea (loose stools)", False),
    (r"\b(i )?wan(t to)? vomit\b|\bfeel like vomiting\b|\bdey vomit\b", "nausea or vomiting", False),
    (r"\bcatarr?h\b", "runny or blocked nose (cold)", False),
    (r"\bwaist pain\b|\bmy waist dey pain\b|\bwaist dey pain\b", "lower back pain", True),
    (r"\bbody (dey|is) hot\b|\b(child|baby|pikin|son|daughter) is hot\b|\bhot body\b", "fever (feeling hot)", False),
    (r"\beye dey turn\b|\beyes? (are|is) turning\b|\bhead dey turn\b", "dizziness", False),
    (r"\bbody dey pain\b|\bbody pain\b|\bbody (is )?aching\b", "body aches", False),
    (r"\bpooing\b|\bpoo poo\b|\bstooling\b", "passing stool (possibly loose stools)", True),
    (r"\bi no fit sleep\b|\bcan'?t sleep\b", "trouble sleeping", False),
    (r"\bbreast pain\b|\bmy breast dey pain\b", "breast pain", False),
]
_PHRASE_RE = [(re.compile(p), term, amb) for p, term, amb in _PHRASES]

# The five dosage-matrix products and the common names people type for them.
MEDICINE_ALIASES: Dict[str, str] = {
    "paracetamol": "paracetamol", "acetaminophen": "paracetamol", "panadol": "paracetamol",
    "emzor": "paracetamol", "tylenol": "paracetamol", "calpol": "paracetamol",
    "ibuprofen": "ibuprofen", "brufen": "ibuprofen", "nurofen": "ibuprofen", "advil": "ibuprofen",
    "cetirizine": "cetirizine", "zyrtec": "cetirizine", "piriton": "other_antihistamine",
    "ors": "ors", "oral rehydration": "ors", "rehydration salt": "ors", "rehydration salts": "ors",
    "antacid": "antacid", "antacids": "antacid", "gaviscon": "antacid", "mist mag": "antacid",
    "magnesium trisilicate": "antacid",
    # Outside the matrix: recognised so the app can say it cannot advise on them.
    "amoxicillin": "other", "amoxil": "other", "augmentin": "other", "flagyl": "other",
    "metronidazole": "other", "ciprofloxacin": "other", "coartem": "other", "artemether": "other",
    "chloroquine": "other", "aspirin": "other", "diclofenac": "other", "tramadol": "other",
    "antibiotic": "other", "antibiotics": "other", "antimalarial": "other",
}
_FUZZY_NAMES = [n for n in MEDICINE_ALIASES if " " not in n and len(n) >= 6]
_MED_PHRASES = [n for n in MEDICINE_ALIASES if " " in n or len(n) < 6]

# "what is my name", "who am I", Pidgin "wetin be my name".
_IDENTITY = re.compile(
    r"\b(what'?s|what is|wetin be|tell me) my (name|age|phone number|number|address|email)\b"
    r"|\bdo you know (my name|who i am|me)\b|\bwho am i\b|\byou know my name\b")
_CHILD = re.compile(r"\b(child|children|kid|kids|son|daughter|baby|babies|toddler|infant|newborn|pikin|"
                    r"my boy|my girl|small pikin)\b")


def normalize(text: str) -> Dict[str, object]:
    """What the app understood from informal words: {"terms": [...], "ambiguous": [...], "medicines": [...]}"""
    t = (text or "").lower()
    terms: List[str] = []
    ambiguous: List[str] = []
    for rx, term, amb in _PHRASE_RE:
        if rx.search(t) and term not in terms:
            terms.append(term)
            if amb:
                ambiguous.append(term)
    meds = medicines(t)
    for m in meds:
        label = medicine_label(m)
        if label and label not in terms:
            terms.append(label)
    return {"terms": terms[:6], "ambiguous": ambiguous, "medicines": meds}


def medicines(text: str) -> List[str]:
    """Canonical medicine ids named in the text, typos included ("paracetemol" -> paracetamol)."""
    t = (text or "").lower()
    found: List[str] = []
    for phrase in _MED_PHRASES:
        if re.search(rf"\b{re.escape(phrase)}\b", t):
            found.append(MEDICINE_ALIASES[phrase])
    for word in re.findall(r"[a-z]{5,}", t):
        if word in MEDICINE_ALIASES:
            found.append(MEDICINE_ALIASES[word])
            continue
        close = difflib.get_close_matches(word, _FUZZY_NAMES, n=1, cutoff=0.8)
        if close:
            found.append(MEDICINE_ALIASES[close[0]])
    out: List[str] = []
    for m in found:
        if m not in out:
            out.append(m)
    return out


def medicine_label(med_id: str) -> Optional[str]:
    return {"paracetamol": "paracetamol", "ibuprofen": "ibuprofen", "cetirizine": "cetirizine",
            "ors": "oral rehydration salts (ORS)", "antacid": "antacid"}.get(med_id)


def asks_identity(text: str) -> bool:
    return bool(_IDENTITY.search((text or "").lower()))


def mentions_child(text: str) -> bool:
    return bool(_CHILD.search((text or "").lower()))


def is_blank(text: str) -> bool:
    """Nothing a person could be asked about: empty, spaces, or only punctuation."""
    return not re.search(r"\w", text or "")
