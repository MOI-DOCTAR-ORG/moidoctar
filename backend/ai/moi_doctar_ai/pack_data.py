"""Concern pack adapted from the approved symptom tables.

Option text is edited table wording, not a verbatim cell and not model prose.
See backend/ai/README.md for every intentional difference.

Sources, supplied as the V1 pack:
typhoid, respiratory infection, hypertension, diarrheal disease.
"""

DISCLAIMER = (
    "Moi Doctar does not diagnose illness, prescribe medication, change a dose, "
    "or replace a clinician. It does not guarantee that any facility is open or "
    "available. A result is informational guidance from the approved symptom table."
)

LEVELS = {
    "red": {
        "headline": "Emergency. Get care now.",
        "summary": "Life threatening emergency. Do not wait at home.",
    },
    "yellow": {
        "headline": "Urgent. See a doctor quickly.",
        "summary": "Urgent. See a doctor quickly.",
    },
    "green": {
        "headline": "Stable. Monitor at home.",
        "summary": "Stable. Monitor at home, and seek care if this gets worse.",
    },
}

BODY = ("head", "chest", "breathing", "abdomen", "limbs", "skin", "allergies")

BODY_PROMPTS = {
    "head": "Which description best matches your head right now?",
    "chest": "Which description best matches your chest right now?",
    "breathing": "Which description best matches your breathing right now?",
    "abdomen": "Which description best matches your abdomen right now?",
    "limbs": "Which description best matches your limbs right now?",
    "skin": "Which description best matches your skin right now?",
    "allergies": "Which description best matches a reaction to medicine?",
}


def _areas(cells):
    questions = []
    for area in BODY:
        green, yellow, red = cells[area]
        questions.append(
            {
                "id": area,
                "kind": "body",
                "prompt": BODY_PROMPTS[area],
                "options": [
                    {"id": "green", "level": "green", "text": green},
                    {"id": "yellow", "level": "yellow", "text": yellow},
                    {"id": "red", "level": "red", "text": red},
                    {"id": "none", "level": "none", "text": "None of these"},
                ],
            }
        )
    return questions


CONCERNS = [
    {
        "id": "typhoid",
        "name": "Typhoid",
        "table": "Typhoid Symptom Table",
        "blurb": "Fever pattern, cough, stomach pain, weakness, and rash.",
        "always_steps": [
            "If a clinician has already prescribed an antibiotic, finish that course. This app cannot start, stop, or change a medicine.",
        ],
        "level_steps": {
            "yellow": [
                "Caregivers should wash hands carefully. The table says typhoid spreads by the fecal-oral route.",
            ],
            "red": [
                "Caregivers should wash hands carefully. The table says typhoid spreads by the fecal-oral route.",
                "Sudden hard abdominal pain in typhoid is marked as a life-threatening emergency.",
            ],
        },
        "questions": _areas(
            {
                "head": (
                    "Dull, persistent headache, or a heavy feeling.",
                    "Constant throbbing, mental fog, or extreme lethargy.",
                    "Muttering delirium, picking at bedclothes, or loss of consciousness.",
                ),
                "chest": (
                    "Occasional dry cough.",
                    "Persistent cough, or a heart rate that feels slow despite high fever.",
                    "Severe chest pain, or signs of a secondary lung infection.",
                ),
                "breathing": (
                    "Normal breathing rate.",
                    "Breathing faster than usual while resting.",
                    "Rapid, shallow breathing, or a bluish tint to the lips or nails.",
                ),
                "abdomen": (
                    "Constipation or mild pea-soup diarrhea, and no appetite.",
                    "Bloated or distended stomach, frequent diarrhea, or moderate pain.",
                    "Sudden intense pain, or a board-like hard abdomen.",
                ),
                "limbs": (
                    "General muscle aches and feeling tired.",
                    "Extreme weakness, or unable to leave bed without help.",
                    "Inability to move, or cold clammy limbs.",
                ),
                "skin": (
                    "Fever that rises a bit more each day.",
                    "Faint pink spots on the chest or stomach.",
                    "Black tarry stools, or vomiting blood.",
                ),
                "allergies": (
                    "No medicine reaction.",
                    "Mild rash or itching after taking antibiotics.",
                    "Swelling of the face or throat, or fainting after taking medication.",
                ),
            }
        )
        + [
            {
                "id": "bleed",
                "kind": "critical",
                "prompt": "Are you vomiting blood, or passing black tarry stools?",
                "options": [
                    {"id": "no", "level": "none", "text": "No"},
                    {
                        "id": "yes",
                        "level": "red",
                        "text": "Yes. Vomiting blood or black tarry stools.",
                    },
                ],
            },
            {
                "id": "illness_week",
                "kind": "critical",
                "prompt": "How long has this illness been going on?",
                "options": [
                    {"id": "week_1", "level": "none", "text": "About a week or less"},
                    {"id": "week_2", "level": "none", "text": "About two weeks"},
                    {
                        "id": "week_3",
                        "level": "none",
                        "text": "About three weeks or more",
                        "note": "The table says the third week is when a dangerous abdominal complication is most likely. Sudden severe abdominal pain or a hard abdomen needs emergency care.",
                    },
                ],
            },
        ],
    },
    {
        "id": "respiratory",
        "name": "Respiratory infection",
        "table": "Respiratory Infection Symptom Logic Table",
        "blurb": "Cough, chest tightness, breathing effort, fever, and oxygen warning signs.",
        "always_steps": [],
        "level_steps": {
            "red": [
                "Blue, gray, or purple lips, tongue, or face means the body is not getting enough oxygen.",
            ],
        },
        "questions": _areas(
            {
                "head": (
                    "Mild headache, heavy sinuses, or a runny nose.",
                    "Constant severe headache, or feeling very dizzy or lightheaded.",
                    "Confusion, extreme sleepiness that makes you hard to wake, or loss of consciousness.",
                ),
                "chest": (
                    "Mild soreness from coughing.",
                    "Tightness in the chest, or pain when taking a deep breath.",
                    "Crushing chest pain, or feeling like you are suffocating.",
                ),
                "breathing": (
                    "Occasional coughing, with a normal breathing rate.",
                    "Shortness of breath during a light walk, or wheezing.",
                    "Gasping for air, very fast or shallow breathing, or nostrils flaring to breathe.",
                ),
                "abdomen": (
                    "Normal abdomen, or mild nausea from swallowing mucus.",
                    "Sharp pain in the upper abdomen.",
                    "Skin sucking in between the ribs or above the collarbone while breathing.",
                ),
                "limbs": (
                    "General tiredness, or mild muscle aches.",
                    "Extreme fatigue, or unable to walk across a room without stopping to breathe.",
                    "Limbs feeling cold, or a bluish or gray tint to the fingernails or skin.",
                ),
                "skin": (
                    "Normal color, with mild sweating or fever.",
                    "Persistent high fever, or very pale skin.",
                    "Blue or purple tint to the lips, tongue, or face.",
                ),
                "allergies": (
                    "Itchy eyes or sneezing.",
                    "Skin rash or hives after taking antibiotics or cough syrup.",
                    "Swelling of the lips or tongue, a closed throat, or sudden silent wheezing.",
                ),
            }
        )
        + [
            {
                "id": "spo2",
                "kind": "critical",
                "prompt": "If you have a pulse oximeter, what is the reading?",
                "options": [
                    {"id": "unknown", "level": "none", "text": "I do not have a reading"},
                    {"id": "at_least_92", "level": "none", "text": "92% or higher"},
                    {
                        "id": "below_92",
                        "level": "red",
                        "text": "Below 92%",
                        "note": "The table places a reading below 92% between urgent and emergency. This app treats it as emergency.",
                    },
                ],
            },
            {
                "id": "indrawing",
                "kind": "critical",
                "prompt": "Is the skin pulling in deeply between the ribs or at the base of the throat with each breath?",
                "options": [
                    {"id": "no", "level": "none", "text": "No"},
                    {
                        "id": "yes",
                        "level": "red",
                        "text": "Yes. The skin pulls in deeply while breathing.",
                    },
                ],
            },
            {
                "id": "phlegm",
                "kind": "critical",
                "prompt": "What is the cough bringing up?",
                "options": [
                    {"id": "none", "level": "none", "text": "No cough, or a dry cough"},
                    {"id": "clear", "level": "none", "text": "Clear mucus"},
                    {
                        "id": "colored",
                        "level": "yellow",
                        "text": "Thick green, rusty, or blood-stained phlegm",
                        "note": "The table marks this cough as urgent, to be checked for pneumonia. This app cannot choose an antibiotic.",
                    },
                ],
            },
        ],
    },
    {
        "id": "hypertension",
        "name": "Hypertension",
        "table": "Hypertension Symptom Table",
        "blurb": "Blood pressure with headache, chest pain, breathing trouble, weakness, or vision change.",
        "always_steps": [
            "High blood pressure often has no symptoms. This result is not a blood pressure measurement.",
        ],
        "level_steps": {
            "red": [
                "The red column is for signs of damage to the brain, heart, or a major artery. Get emergency care now.",
            ],
        },
        "questions": _areas(
            {
                "head": (
                    "No head symptoms.",
                    "Severe headache, pounding in the ears or neck, or dizziness.",
                    "Sudden numbness or weakness, especially on one side, confusion, or seizures.",
                ),
                "chest": (
                    "No chest pain.",
                    "Palpitations, or a feeling that the heart is skipping a beat.",
                    "Crushing chest pain, or pressure like an elephant sitting on the chest.",
                ),
                "breathing": (
                    "Normal breathing.",
                    "Shortness of breath during light activity.",
                    "Severe difficulty breathing, or gasping for air while sitting still.",
                ),
                "abdomen": (
                    "No abdominal symptoms.",
                    "Mild nausea, or a general unwell feeling.",
                    "Severe sudden pain in the upper abdomen or back.",
                ),
                "limbs": (
                    "Normal movement.",
                    "Tingling or pins and needles in the hands or feet.",
                    "Sudden loss of balance, or inability to lift one arm or leg.",
                ),
                "skin": (
                    "Normal skin tone.",
                    "Flushing, facial redness, or sweating.",
                    "Cold clammy skin, bluish lips, or unusual bruising or bleeding.",
                ),
                "allergies": (
                    "No medicine reaction.",
                    "Dry cough or mild swelling after blood pressure medicine.",
                    "Severe swelling of the lips or tongue, or fainting after a first dose.",
                ),
            }
        )
        + [
            {
                "id": "bp",
                "kind": "critical",
                "prompt": "What is the most recent blood pressure, if you know it?",
                "options": [
                    {"id": "unknown", "level": "none", "text": "I do not know the number"},
                    {"id": "under_140_90", "level": "none", "text": "Below 140/90"},
                    {
                        "id": "elevated",
                        "level": "yellow",
                        "text": "140/90 or higher, but under 180/120",
                    },
                    {
                        "id": "crisis_quiet",
                        "level": "yellow",
                        "text": "180/120 or higher, without the emergency symptoms above",
                        "note": "A reading over 180/120 needs a clinician the same day. Emergency symptoms make it an emergency.",
                    },
                ],
            },
            {
                "id": "vision",
                "kind": "critical",
                "prompt": "Has your vision blurred, or have you suddenly lost sight?",
                "options": [
                    {"id": "no", "level": "none", "text": "No"},
                    {
                        "id": "yes",
                        "level": "red",
                        "text": "Yes. Blurred vision or sudden loss of sight.",
                        "note": "The table marks vision change with high blood pressure as emergency. This app treats the vision change itself as emergency.",
                    },
                ],
            },
        ],
    },
    {
        "id": "diarrhea",
        "name": "Diarrheal illness",
        "table": "Diarrheal Symptom Table",
        "blurb": "Loose stools, vomiting, thirst, weakness, and dehydration.",
        "always_steps": [],
        "level_steps": {
            "green": [
                "The table says to sip oral rehydration solution slowly and constantly at the stable and urgent stages. It does not give a dose.",
            ],
            "yellow": [
                "The table says to sip oral rehydration solution slowly and constantly at the stable and urgent stages. It does not give a dose.",
            ],
            "red": [
                "Get emergency care now. Home fluids are not enough when the red column matches, especially if drinks will not stay down.",
            ],
        },
        "questions": _areas(
            {
                "head": (
                    "Mild thirst, and normal alertness.",
                    "Irritable or restless, very thirsty, or sunken eyes.",
                    "Lethargic, unconscious, or unable to hold the head up.",
                ),
                "chest": (
                    "Normal heart rate.",
                    "Rapid heart rate.",
                    "Very weak or absent pulse, or an extremely fast heart rate.",
                ),
                "breathing": (
                    "Normal breathing.",
                    "Slightly faster breathing than usual.",
                    "Deep, rapid breathing.",
                ),
                "abdomen": (
                    "Mild cramping, with 1 to 3 loose stools a day.",
                    "Frequent watery stools, severe cramping, or vomiting.",
                    "Unable to drink or keep any fluids down, or severe distension.",
                ),
                "limbs": (
                    "Normal strength.",
                    "Muscle cramps, or feeling very weak.",
                    "Cannot stand, or cold and clammy hands and feet.",
                ),
                "skin": (
                    "Skin snaps back quickly when pinched.",
                    "Skin goes back slowly when pinched, or a dry mouth and tongue.",
                    "Skin stays in a tent when pinched, or no tears when crying.",
                ),
                "allergies": (
                    "No medicine reaction.",
                    "Rash, or diarrhea that got worse after an antibiotic.",
                    "Swelling or fainting shortly after taking a treatment medicine.",
                ),
            }
        )
        + [
            {
                "id": "pinch",
                "kind": "critical",
                "prompt": "Pinch the skin on the abdomen or the back of the hand. What happens?",
                "options": [
                    {"id": "fast", "level": "none", "text": "It snaps back quickly"},
                    {"id": "slow", "level": "yellow", "text": "It goes back slowly"},
                    {
                        "id": "tent",
                        "level": "red",
                        "text": "It stays tented, or takes more than 2 seconds",
                        "note": "The table says a pinch that takes more than 2 seconds is the emergency zone.",
                    },
                ],
            },
            {
                "id": "rice_water",
                "kind": "critical",
                "prompt": "Are the stools pale and cloudy, like water used to wash rice?",
                "options": [
                    {"id": "no", "level": "none", "text": "No"},
                    {
                        "id": "yes",
                        "level": "red",
                        "text": "Yes. Pale cloudy stools like rice water.",
                        "note": "The table says rice-water stools need emergency fluid treatment and can worsen faster than other diarrhea.",
                    },
                ],
            },
            {
                "id": "blood_stool",
                "kind": "critical",
                "prompt": "Is there visible blood in the stool?",
                "options": [
                    {"id": "no", "level": "none", "text": "No"},
                    {
                        "id": "yes",
                        "level": "yellow",
                        "text": "Yes. Visible blood in the stool.",
                        "note": "The table marks visible blood as urgent clinic care. This app cannot choose an antibiotic.",
                    },
                ],
            },
            {
                "id": "keeps_fluids",
                "kind": "critical",
                "prompt": "Can you drink and keep fluids down?",
                "options": [
                    {"id": "yes", "level": "none", "text": "Yes"},
                    {
                        "id": "no",
                        "level": "red",
                        "text": "No. Fluids will not stay down.",
                    },
                ],
            },
        ],
    },
]
