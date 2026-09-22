from moi_doctar_ai.loop import ModelError, agent_decide
from tests.test_rules import fill


class Scripted:
    def __init__(self, rounds):
        self.rounds = list(rounds)
        self.seen = []

    def generate(self, contents, tools):
        self.seen.append(contents)
        if not self.rounds:
            raise ModelError("script ended")
        return self.rounds.pop(0)


def test_matching_structured_output_is_the_agent():
    answers = fill("diarrhea", rice_water="yes")
    model = Scripted(
        [
            [{"name": "read_decision", "args": {"concern_id": "diarrhea"}}],
            [{"name": "StructuredOutput", "args": {"concern_id": "diarrhea", "urgency": "red"}}],
        ]
    )
    result = agent_decide("diarrhea", answers, model)
    assert result["urgency"] == "red"
    assert result["source"] == "agent"
    assert result["rounds"] == 2


def test_softer_urgency_falls_closed_to_red():
    answers = fill("diarrhea", rice_water="yes")
    soft = {"name": "StructuredOutput", "args": {"concern_id": "diarrhea", "urgency": "green"}}
    model = Scripted([[soft], [soft], [soft]])
    result = agent_decide("diarrhea", answers, model)
    assert result["urgency"] == "red"
    assert result["source"] == "rule_fallback"


def test_repeated_identical_tool_call_stops():
    answers = fill("respiratory", spo2="below_92")
    call = [{"name": "read_decision", "args": {"concern_id": "respiratory"}}]
    model = Scripted([call, call, call, call])
    result = agent_decide("respiratory", answers, model)
    assert result["urgency"] == "red"
    assert result["source"] == "rule_fallback"
    assert result["rounds"] == 3


def test_model_failure_keeps_the_rule():
    answers = fill("hypertension", vision="yes")

    class Down:
        def generate(self, contents, tools):
            raise ModelError("down")

    result = agent_decide("hypertension", answers, Down())
    assert result["urgency"] == "red"
    assert result["source"] == "rule_fallback"


def test_wrong_then_corrected_structured_output():
    answers = fill("diarrhea", blood_stool="yes")
    model = Scripted(
        [
            [{"name": "StructuredOutput", "args": {"concern_id": "diarrhea", "urgency": "green"}}],
            [{"name": "StructuredOutput", "args": {"concern_id": "diarrhea", "urgency": "yellow"}}],
        ]
    )
    result = agent_decide("diarrhea", answers, model)
    assert result["urgency"] == "yellow"
    assert result["source"] == "agent"
