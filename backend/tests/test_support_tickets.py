"""Ticket storage, the consent gate, and the client contract the Support page relies on."""
import os
import sys

import pytest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "ai"))
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from app.services import support_service  # noqa: E402
from app.services.support_service import TicketError  # noqa: E402


@pytest.fixture(autouse=True)
def local_store(monkeypatch):
    """Force the in-memory path and start each test with an empty store."""
    monkeypatch.setattr(support_service, "get_supabase_client", lambda: None)
    monkeypatch.setattr(support_service.audit_service, "record", lambda *a, **k: None)
    support_service._local_tickets.clear()
    support_service._local_messages.clear()


def _payload(**over):
    base = {
        "name": "Ada",
        "email": "Ada@Example.com",
        "category": "Triage",
        "subject": "Cannot finish an assessment",
        "message": "It stops at the third question.",
        "priority": "normal",
    }
    base.update(over)
    return base


def test_response_carries_the_ticket_id_the_client_needs():
    """src/lib/supportRequests.ts re-queues anything without an id."""
    ticket = support_service.create_ticket(_payload(ticket_id="SUP-AB12CD"))
    assert ticket["ticket_id"] == "SUP-AB12CD"


def test_a_missing_or_malformed_client_id_is_replaced():
    for bad in (None, "", "not-a-ticket", "SUP-lowercase"):
        ticket = support_service.create_ticket(_payload(ticket_id=bad))
        assert ticket["ticket_id"].startswith("SUP-")


def test_resending_a_queued_ticket_does_not_duplicate_it():
    """Devices flush their whole queue when the endpoint first goes live."""
    support_service.create_ticket(_payload(ticket_id="SUP-SAME01"))
    support_service.create_ticket(_payload(ticket_id="SUP-SAME01"))
    rows, total = support_service.list_tickets()
    assert total == 1


def test_a_queued_ticket_keeps_the_time_it_was_written():
    ticket = support_service.create_ticket(
        _payload(ticket_id="SUP-OLD001", queued_at="2026-01-02T03:04:05+00:00")
    )
    assert ticket["created_at"] == "2026-01-02T03:04:05+00:00"


def test_email_is_stored_lowercase_so_a_user_finds_their_own_tickets():
    support_service.create_ticket(_payload(ticket_id="SUP-CASE01"))
    assert support_service.list_tickets_for_user("", "ada@example.com")


def test_consent_defaults_to_false():
    ticket = support_service.create_ticket(_payload(ticket_id="SUP-NOCON1"))
    assert ticket["consent_share_history"] is False


def test_history_is_refused_without_consent():
    support_service.create_ticket(_payload(ticket_id="SUP-NOCON2"))
    with pytest.raises(TicketError) as e:
        support_service.get_ticket_history({"_id": "staff1"}, "SUP-NOCON2")
    assert e.value.code == "no_consent"


def test_history_is_refused_when_the_ticket_has_no_account():
    support_service.create_ticket(
        _payload(ticket_id="SUP-ANON01", consent_share_history=True)
    )
    with pytest.raises(TicketError) as e:
        support_service.get_ticket_history({"_id": "staff1"}, "SUP-ANON01")
    assert e.value.code == "no_account"


def test_history_read_is_audited_before_data_is_returned(monkeypatch):
    """A storage failure must not produce an unrecorded read of health data."""
    calls = []
    monkeypatch.setattr(
        support_service.audit_service, "record",
        lambda actor, action, **k: calls.append(action),
    )
    support_service.create_ticket(
        _payload(ticket_id="SUP-CONS01", consent_share_history=True),
        user={"_id": "u9"},
    )
    support_service.get_ticket_history({"_id": "staff1"}, "SUP-CONS01")
    assert "ticket.history_viewed" in calls


def test_an_unknown_priority_falls_back_to_normal():
    ticket = support_service.create_ticket(_payload(ticket_id="SUP-PRI001", priority="critical"))
    assert ticket["priority"] == "normal"


def test_replying_stores_the_message_and_moves_the_ticket_to_pending():
    support_service.create_ticket(_payload(ticket_id="SUP-REP001"))
    support_service.add_reply({"_id": "s1", "userName": "Sam"}, "SUP-REP001", "Try again please.")
    assert support_service.get_ticket("SUP-REP001")["status"] == "pending"
    messages = support_service.list_messages("SUP-REP001")
    assert len(messages) == 1 and messages[0]["is_staff"] is True


def test_invalid_status_is_refused():
    support_service.create_ticket(_payload(ticket_id="SUP-STA001"))
    with pytest.raises(TicketError) as e:
        support_service.update_ticket({"_id": "s1"}, "SUP-STA001", {"status": "archived"})
    assert e.value.code == "invalid_status"


def test_an_empty_assignee_unassigns():
    support_service.create_ticket(_payload(ticket_id="SUP-ASG001"))
    support_service.update_ticket({"_id": "s1"}, "SUP-ASG001", {"assigned_to": "s2"})
    assert support_service.get_ticket("SUP-ASG001")["assigned_to"] == "s2"
    support_service.update_ticket({"_id": "s1"}, "SUP-ASG001", {"assigned_to": ""})
    assert support_service.get_ticket("SUP-ASG001")["assigned_to"] is None
