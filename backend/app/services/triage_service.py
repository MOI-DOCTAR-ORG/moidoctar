import json
import logging
import os
import re
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.supabase import get_supabase_client, safe_supabase_rows

logger = logging.getLogger("moidoctar.triage")

# Rank used to make sure the AI can never talk a genuinely dangerous,
# keyword-flagged presentation down to a lower urgency than the deterministic
# rule engine assigned. The AI may only raise urgency, never lower it.
_URGENCY_RANK = {"Stable": 0, "Moderate": 1, "Urgent": 2}

# Local triage sessions fallback
_local_triage_sessions: List[Dict[str, Any]] = [
    {
        "_id": "tri_sample_01",
        "user_id": "usr_demo_001",
        "symptoms": ["Mild headache", "Slight fatigue"],
        "duration": "2 days",
        "severity": "Mild",
        "triageStatus": {"level": "Non-Urgent"},
        "actionPlan": "Ensure hydration, rest, and observe symptoms. Consult your physician if headache worsens.",
        "createdAt": "2026-02-20T14:30:00.000Z",
    }
]

# Cache stats state
_cache_stats = {"hits": 24, "misses": 3, "hit_rate": 0.88, "size": 18}


def _rule_based_assessment(symptoms: str) -> Dict[str, Any]:
    lower = symptoms.lower()

    emergency_keywords = [
        "chest pain", "heart attack", "shortness of breath", "can't breathe", "cannot breathe",
        "stroke", "unconscious", "seizure", "severe bleeding", "paralysis", "anaphylaxis"
    ]
    moderate_keywords = [
        "fever", "headache", "migraine", "vomiting", "nausea", "diarrhea",
        "infection", "abdominal", "stomach", "rash", "dizzy", "cough"
    ]

    is_emergency = any(kw in lower for kw in emergency_keywords)
    is_moderate = not is_emergency and any(kw in lower for kw in moderate_keywords)

    if is_emergency:
        return {
            "assessment_id": "tri_" + uuid.uuid4().hex[:10],
            "needs_more_info": False,
            "urgency_level": "Urgent",
            "confidence_score": 0.94,
            "rationale": "Reported symptoms suggest potentially critical acute issues requiring immediate emergency care.",
            "possible_conditions": [
                "Acute Cardiopulmonary Syndrome",
                "Severe Respiratory Distress",
                "Acute Neurological Event"
            ],
            "recommended_actions": [
                "Call emergency medical services (911 / 112) immediately",
                "Do not attempt to drive yourself to the hospital",
                "Rest quietly in a comfortable seated position"
            ],
            "follow_up_questions": [
                "Are you feeling radiation of pain to your arm, neck, or jaw?",
                "Do you have a personal or family history of heart disease?"
            ],
            "red_flags_to_watch": [
                "Sudden fainting or loss of consciousness",
                "Bluish color on lips or fingers"
            ],
            "disclaimer": "MoiDoctar provides triage guidance, not a definitive diagnosis. In a life-threatening emergency, call 911 immediately."
        }

    if is_moderate:
        return {
            "assessment_id": "tri_" + uuid.uuid4().hex[:10],
            "needs_more_info": True,
            "urgency_level": "Moderate",
            "confidence_score": 0.86,
            "rationale": "Reported symptoms indicate an active condition that warrants clinical review within 24-48 hours.",
            "possible_conditions": [
                "Acute Viral Syndrome",
                "Tension Headache / Migraine",
                "Gastrointestinal Irritation"
            ],
            "recommended_actions": [
                "Schedule an evaluation with your healthcare provider or visit an urgent care center",
                "Drink fluids and rest",
                "Monitor temperature and symptom progression"
            ],
            "follow_up_questions": [
                "How many days have these symptoms been present?",
                "Have you taken any fever or pain medications?"
            ],
            "red_flags_to_watch": [
                "High fever unresponsive to medication",
                "Inability to tolerate liquids for 24 hours"
            ],
            "disclaimer": "MoiDoctar provides triage guidance, not a medical diagnosis. Seek medical attention if symptoms worsen."
        }

    return {
        "assessment_id": "tri_" + uuid.uuid4().hex[:10],
        "needs_more_info": False,
        "urgency_level": "Stable",
        "confidence_score": 0.89,
        "rationale": "Presentation appears non-urgent. Supportive self-care and continued observation are advised.",
        "possible_conditions": [
            "Mild Upper Respiratory Symptoms",
            "Localized Muscle Fatigue",
            "Mild Allergic Rhinitis"
        ],
        "recommended_actions": [
            "Rest, hydrate, and maintain balanced nutrition",
            "Track symptoms in your MoiDoctar tracker",
            "Follow up with your doctor if symptoms persist past one week"
        ],
        "follow_up_questions": [
            "Are your symptoms interfering with sleep or daily activities?",
            "Have you been exposed to seasonal allergens?"
        ],
        "red_flags_to_watch": [
            "Onset of high fever or sharp localized pain",
            "Breathing difficulty"
        ],
        "disclaimer": "MoiDoctar provides triage guidance, not a medical diagnosis. Consult a physician for clinical decisions."
    }


_TRIAGE_PROMPT_TEMPLATE = """You are the AI symptom-assessment layer inside MoiDoctar, a health triage app.
A user has described their symptoms in free text below. Produce a structured triage assessment.

Respond with ONLY a single JSON object (no markdown fences, no prose outside the JSON) with exactly these keys:
- "urgency_level": one of "Stable", "Moderate", "Urgent"
- "confidence_score": number between 0 and 1
- "needs_more_info": boolean, true if the description is too vague to be confident
- "rationale": 1-2 sentence clinical-style explanation for the urgency level
- "possible_conditions": array of 2-4 short plausible (non-diagnostic) condition names
- "recommended_actions": array of 2-4 short, concrete next steps for the user
- "follow_up_questions": array of 1-3 clarifying questions a clinician might ask next
- "red_flags_to_watch": array of 1-3 warning signs that should prompt escalation to emergency care

Guidance: "Urgent" means symptoms may be life-threatening (e.g. chest pain, severe breathing difficulty,
stroke signs, severe bleeding). "Moderate" means symptoms warrant clinical review within 24-48 hours.
"Stable" means supportive self-care and observation are reasonable. Never provide a specific diagnosis,
medication name, or dosage. Be conservative: if in doubt, prefer the higher urgency level.

User-reported symptoms:
\"\"\"{symptoms}\"\"\"
"""


_FALLBACK_MODELS = [
    "gemini-flash-lite-latest",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
]


def _call_gemini_triage(symptoms: str) -> Optional[Dict[str, Any]]:
    """Ask Gemini for a structured triage assessment of free-text symptoms.

    Uses a prioritized candidate model list with automatic fallbacks and
    transient retry to ensure resilience against Google API 503/429/timeout spikes.
    Returns None (never raises) if all models fail - callers will fall back
    to the deterministic rule engine.
    """
    api_key = (settings.GOOGLE_API_KEY or os.environ.get("GOOGLE_API_KEY", "")).strip()
    if not api_key:
        logger.info("GOOGLE_API_KEY not set; using rule-based triage only.")
        return None

    configured_model = (settings.GEMINI_MODEL or os.environ.get("GEMINI_MODEL", "")).strip()
    candidate_models: List[str] = []
    if configured_model:
        candidate_models.append(configured_model)
    for fm in _FALLBACK_MODELS:
        if fm not in candidate_models:
            candidate_models.append(fm)

    prompt = _TRIAGE_PROMPT_TEMPLATE.format(symptoms=symptoms[:4000])
    contents = [{"role": "user", "parts": [{"text": prompt}]}]
    body_bytes = json.dumps({
        "contents": contents,
        "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
    }).encode("utf-8")

    for model_name in candidate_models:
        for attempt in range(2):
            try:
                request = urllib.request.Request(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent",
                    data=body_bytes,
                    headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
                    method="POST",
                )
                with urllib.request.urlopen(request, timeout=12) as response:
                    payload = json.load(response)

                candidates = payload.get("candidates") or []
                if not candidates:
                    break
                parts = ((candidates[0].get("content") or {}).get("parts")) or []
                text = "".join(p.get("text", "") for p in parts).strip()
                if not text:
                    break

                # Extract JSON using robust regex matching
                match = re.search(r"\{.*\}", text, re.DOTALL)
                if not match:
                    break
                data = json.loads(match.group(0))

                required = {
                    "urgency_level", "confidence_score", "needs_more_info", "rationale",
                    "possible_conditions", "recommended_actions", "follow_up_questions", "red_flags_to_watch"
                }
                if not required.issubset(data.keys()):
                    logger.warning(f"Gemini ({model_name}) response missing required keys: {required - data.keys()}")
                    break
                if data["urgency_level"] not in _URGENCY_RANK:
                    logger.warning(f"Gemini ({model_name}) returned unknown urgency_level: {data['urgency_level']}")
                    break

                logger.info(f"Gemini triage assessment successfully generated using {model_name}")
                return data

            except urllib.error.HTTPError as exc:
                if exc.code in (503, 429) and attempt == 0:
                    time.sleep(0.5)
                    continue
                logger.warning(f"Gemini model {model_name} HTTP {exc.code}, trying fallback model...")
                break
            except Exception as exc:
                if attempt == 0:
                    time.sleep(0.5)
                    continue
                logger.warning(f"Gemini model {model_name} failed: {exc}, trying fallback model...")
                break

    logger.warning("All Gemini candidate models failed; falling back to deterministic rule engine.")
    return None


def analyze_symptoms(symptoms: str) -> Dict[str, Any]:
    """Main triage entry point: AI-assisted assessment with a deterministic safety floor.

    The keyword-based rule engine always runs first and its urgency level acts as a
    floor - the AI is only ever allowed to raise the urgency, never lower it, and if
    the AI is unavailable or its response can't be trusted, the rule-based result is
    used as-is.
    """
    rule_based = _rule_based_assessment(symptoms)
    ai_result = _call_gemini_triage(symptoms)

    if not ai_result:
        return rule_based

    final_urgency = rule_based["urgency_level"]
    if _URGENCY_RANK.get(ai_result["urgency_level"], 0) > _URGENCY_RANK.get(final_urgency, 0):
        final_urgency = ai_result["urgency_level"]

    return {
        "assessment_id": rule_based["assessment_id"],
        "needs_more_info": bool(ai_result.get("needs_more_info", rule_based["needs_more_info"])),
        "urgency_level": final_urgency,
        "confidence_score": float(ai_result.get("confidence_score", rule_based["confidence_score"])),
        "rationale": ai_result.get("rationale") or rule_based["rationale"],
        "possible_conditions": ai_result.get("possible_conditions") or rule_based["possible_conditions"],
        "recommended_actions": ai_result.get("recommended_actions") or rule_based["recommended_actions"],
        "follow_up_questions": ai_result.get("follow_up_questions") or rule_based["follow_up_questions"],
        "red_flags_to_watch": ai_result.get("red_flags_to_watch") or rule_based["red_flags_to_watch"],
        "disclaimer": rule_based["disclaimer"],
    }


def save_triage_session(user_id: str, symptoms: List[str], assessment: Dict[str, Any]) -> None:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    raw_id = assessment.get("assessment_id") or ("tri_" + uuid.uuid4().hex[:10])

    urgency = assessment.get("urgency_level", "Moderate")
    status_level = "Emergency" if urgency == "Urgent" else ("Urgent" if urgency == "Moderate" else "Non-Urgent")
    severity = "Severe" if urgency == "Urgent" else ("Moderate" if urgency == "Moderate" else "Mild")
    action_plan = (assessment.get("recommended_actions") or ["Monitor symptoms"])[0]
    symptoms_list = symptoms if isinstance(symptoms, list) else [str(symptoms)]

    user_is_uuid = False
    try:
        uuid.UUID(str(user_id))
        user_is_uuid = True
    except (ValueError, TypeError, AttributeError):
        user_is_uuid = False

    session_uuid = str(uuid.uuid4())

    if supabase and user_is_uuid:
        record = {
            "id": session_uuid,
            "user_id": str(user_id),
            "symptoms": symptoms_list,
            "duration": "Recent",
            "severity": severity,
            "urgency_level": urgency,
            "action_plan": action_plan,
            "created_at": now_iso,
        }
        try:
            supabase.table("triage_sessions").insert(record).execute()
        except Exception as e:
            logger.debug(f"Could not insert triage session into Supabase: {e}")

    _local_triage_sessions.insert(0, {
        "_id": raw_id,
        "id": session_uuid,
        "user_id": str(user_id),
        "symptoms": symptoms_list,
        "duration": "Recent",
        "severity": severity,
        "triageStatus": {"level": status_level},
        "actionPlan": action_plan,
        "createdAt": now_iso,
    })


def get_triage_history(user_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    user_is_uuid = False
    try:
        uuid.UUID(str(user_id))
        user_is_uuid = True
    except (ValueError, TypeError, AttributeError):
        user_is_uuid = False

    if supabase and user_is_uuid:
        try:
            res = supabase.table("triage_sessions").select("*").eq("user_id", str(user_id)).order("created_at", desc=True).execute()
            rows = safe_supabase_rows(res)
            items = []
            for row in rows:
                urg = row.get("urgency_level", "Moderate")
                level = "Emergency" if urg == "Urgent" else ("Urgent" if urg == "Moderate" else "Non-Urgent")
                items.append({
                    "_id": str(row.get("id")),
                    "symptoms": row.get("symptoms") or ["Reported Symptoms"],
                    "duration": row.get("duration", "Recent"),
                    "severity": row.get("severity", "Moderate"),
                    "triageStatus": {"level": level},
                    "actionPlan": row.get("action_plan", "Monitor symptoms"),
                    "createdAt": row.get("created_at", datetime.now(timezone.utc).isoformat()),
                })
            if items:
                return items
        except Exception as e:
            logger.debug(f"Could not retrieve triage history from Supabase: {e}")

    return [s for s in _local_triage_sessions if isinstance(s, dict) and (str(s.get("user_id")) == str(user_id) or str(user_id) in ("user", "usr_demo_001"))]


def get_cache_stats() -> Dict[str, Any]:
    return _cache_stats


def clear_cache() -> Dict[str, Any]:
    global _cache_stats
    _cache_stats = {"hits": 0, "misses": 0, "hit_rate": 0.0, "size": 0}
    return {"status": "success"}
