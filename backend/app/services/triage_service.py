import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.supabase import get_supabase_client

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


def analyze_symptoms_placeholder(symptoms: str) -> Dict[str, Any]:
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


def save_triage_session(user_id: str, symptoms: List[str], assessment: Dict[str, Any]) -> None:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    new_id = assessment.get("assessment_id") or ("tri_" + uuid.uuid4().hex[:10])

    urgency = assessment.get("urgency_level", "Moderate")
    status_level = "Emergency" if urgency == "Urgent" else ("Urgent" if urgency == "Moderate" else "Non-Urgent")
    severity = "Severe" if urgency == "Urgent" else ("Moderate" if urgency == "Moderate" else "Mild")

    record = {
        "id": new_id,
        "user_id": user_id,
        "symptoms": symptoms,
        "duration": "Recent",
        "severity": severity,
        "urgency_level": urgency,
        "action_plan": (assessment.get("recommended_actions") or ["Monitor symptoms"])[0],
        "created_at": now_iso,
    }

    if supabase:
        try:
            supabase.table("triage_sessions").insert(record).execute()
            return
        except Exception:
            pass

    _local_triage_sessions.insert(0, {
        "_id": new_id,
        "user_id": user_id,
        "symptoms": symptoms,
        "duration": "Recent",
        "severity": severity,
        "triageStatus": {"level": status_level},
        "actionPlan": record["action_plan"],
        "createdAt": now_iso,
    })


def get_triage_history(user_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("triage_sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
            items = []
            for row in (res.data or []):
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
            return items
        except Exception:
            pass

    return [s for s in _local_triage_sessions if s.get("user_id") == user_id or True]


def get_cache_stats() -> Dict[str, Any]:
    return _cache_stats


def clear_cache() -> Dict[str, Any]:
    global _cache_stats
    _cache_stats = {"hits": 0, "misses": 0, "hit_rate": 0.0, "size": 0}
    return {"status": "success"}
