"""The dosage matrix as structured records, and the gate every medicine question goes through.

Architecture Decision, sections 4, 8 and 9: dosage values come only from the
medical team's reviewed matrix, never from Gemini. Until a record is reviewed
it is PENDING_REVIEW, and no dose from it is shown. Today every record is
pending, so the gate always ends in the approved "under review" copy; once the
reviewers fill a record in and set APPROVED, the gate asks for the fields that
record needs (age, weight, formulation, last dose) before anything is shown.

Scope is the five products the documents name. Anything else is outside the
matrix and gets the same review copy.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from app.services import triage_contract as contract

MATRIX_VERSION = "matrix-2026-09-30.0 (all records pending medical review)"

# What must be known before an approved value may be shown (Behavior spec, section 9).
_ADULT_FIELDS = ["age", "formulation", "allergies", "last_dose_time", "other_medicines_same_ingredient"]
_CHILD_FIELDS = ["age", "weight_kg", "formulation", "allergies", "last_dose_time", "other_medicines_same_ingredient"]


def _record(med_id: str, name: str, ingredient: str) -> Dict[str, Any]:
    return {
        "id": med_id, "name": name, "active_ingredient": ingredient,
        "adult_rule": None, "pediatric_6_plus_rule": None,  # filled only by the medical reviewers
        "weight_required_for": ["pediatric_6_plus"],
        "formulations": [], "single_dose": None, "min_interval_hours": None, "max_24h": None,
        "duration_limit_days": None, "contraindications": [], "duplicate_ingredient_warning": None,
        "source": None, "matrix_version": MATRIX_VERSION,
        "review_status": "PENDING_REVIEW", "reviewer": None, "review_date": None,
    }


MATRIX: Dict[str, Dict[str, Any]] = {
    "paracetamol": _record("paracetamol", "Paracetamol", "paracetamol (acetaminophen)"),
    "ibuprofen": _record("ibuprofen", "Ibuprofen", "ibuprofen"),
    "cetirizine": _record("cetirizine", "Cetirizine", "cetirizine hydrochloride"),
    "ors": _record("ors", "Oral Rehydration Salts (ORS)", "oral rehydration salts"),
    "antacid": _record("antacid", "Antacids", "antacid (varies by product)"),
}

UNDER6_MEDICATION_MESSAGE = ("For a child under 6, medicine questions need a health worker or pharmacist. "
                             "Do not use this app to select or change a dose.")


def gate(meds: List[str], band: Optional[str], known: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Decide what a medicine question may show.

    Returns {"status", "medicines", "missing", "message"} where status is one of:
      under_6          the child is under 6: never the Pediatric 6+ logic, professional review
      pending_review   the record (or the medicine) is not medically approved: review copy
      needs_fields     approved record, but a required field is missing: ask for it
      approved         every check passed (not reachable until a record is approved)
    """
    known = known or {}
    in_scope = [m for m in meds if m in MATRIX]
    if band == "under_6":
        return {"status": "under_6", "medicines": in_scope, "missing": [], "message": UNDER6_MEDICATION_MESSAGE}
    records = [MATRIX[m] for m in in_scope]
    if not records or any(r["review_status"] != "APPROVED" for r in records) or len(in_scope) < len(meds):
        return {"status": "pending_review", "medicines": in_scope, "missing": [],
                "message": contract.MEDICATION_REVIEW_MESSAGE}
    fields = _CHILD_FIELDS if band == "pediatric_6_plus" else _ADULT_FIELDS
    missing = [f for f in fields if known.get(f) in (None, "", [])]
    if band is None:
        missing = ["age"] + [f for f in missing if f != "age"]
    if missing:
        return {"status": "needs_fields", "medicines": in_scope, "missing": missing,
                "message": contract.MEDICATION_REVIEW_MESSAGE}
    return {"status": "approved", "medicines": in_scope, "missing": [], "message": ""}
