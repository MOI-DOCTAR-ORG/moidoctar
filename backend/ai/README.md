# Assessment package

This folder is the AI piece. The backend engineer wires it into `app/services/triage_service.py`. It does not replace that service, and it does not include a demo UI.

Import it with `backend/ai` on `PYTHONPATH`:

```python
from moi_doctar_ai import agent_decide, concerns, decide, questions, GeminiModel
```

| Function | Behavior |
| --- | --- |
| `concerns()` | The four tables: typhoid, respiratory, hypertension, diarrhea. |
| `questions(concern_id)` | The fixed question list for that table. |
| `decide(concern_id, answers)` | Scores the answers. No network call. `source` is `rules`. |
| `agent_decide(concern_id, answers, model)` | Same score, after a model confirmation. |
| `GeminiModel()` | Reads `GOOGLE_API_KEY` and optional `GEMINI_MODEL`. |

`answers` maps every question id to an option id. A missing question or an unknown option raises `PackError`. Extra keys are ignored.

`agent_decide` does not change the urgency or the words. It sets `source` to `agent` when the model returns the same urgency, and `rule_fallback` when the model is missing, fails, or returns a milder level. Call `decide` if you do not want a model call.

The user does not type a prompt. Each question is one approved option. The result text is the table wording in this package, not prose from the model. The model only confirms `green`, `yellow`, or `red`.

Urgency is the highest selected level. Red outranks yellow. Yellow outranks green. If every answer is `none`, the result is still `green` and `reasons` is empty. Do not show that as a positive stable finding.

`reasons` lists the yellow and red option texts the user selected. `steps` also includes fixed lines for that urgency, so a step may name a sign the user did not select.

Set `GOOGLE_API_KEY` in the backend environment. Do not commit it. The default model is `gemini-2.5-flash`. One call times out after 30 seconds. The confirmation uses at most 8 calls.

Run the package tests from this directory:

```bash
pip install pytest
pytest
```

`app/services/triage_service.py` still uses its own keyword placeholder. Point that function at `decide` or `agent_decide` when you are ready to switch. The placeholder names possible conditions and tells people to call 911. This package does not diagnose, does not name a medicine, and does not give a dose.

## Where this pack differs from the symptom tables

Option text is adapted from the four tables, not a verbatim paste. Scoring is the maximum selected level.

These three cases are stricter than the table wording:

- A pulse-oximeter reading below 92% is always red. The respiratory note calls that range yellow-to-red.
- Rice-water stools are always red. The diarrhea table lists them in the yellow abdomen cell. That yellow option here says “frequent watery stools” instead, and rice-water is its own red question.
- Blurred vision or sudden vision loss is always red, even when the reported blood pressure is below 140/90.

Blood pressure of 140/90 or higher, without a red symptom, is yellow. A reading of 180/120 or higher without a red symptom stays yellow. Visible blood in the stool is yellow. A skin pinch that stays tented, or takes more than 2 seconds, is red. Typhoid in week 3 adds a warning and does not by itself raise the level.

Ciprofloxacin and azithromycin are not named. An antibiotic already prescribed should be finished, and this package cannot start or change one. Oral rehydration solution is mentioned for green and yellow diarrhea only, with no dose. The allergy green cell is “no medicine reaction” where the table cell was blank, and that option scores green.
