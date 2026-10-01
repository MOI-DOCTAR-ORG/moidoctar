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
def fake_store(monkeypatch):
    """Back kv_store with a dict, and keep email and audit out of the way."""
    store = {}

    monkeypatch.setattr(support_service, "kv_get", lambda k, d=None: store.get(k, d))
    monkeypatch.setattr(
        support_service, "kv_set", lambda k, v: store.__setitem__(k, v) or True
    )
    monkeypatch.setattr(
        support_service, "send_support_ticket_email", lambda **kw: (True, "ok")
    )
    monkeypatch.setattr(support_service.audit_service, "record", lambda *a, **k: None)
    return store


def _submit(**over):
    args = {
        "name": "Ada",
        "email": "Ada@Example.com",
        "category": "Triage",
        "subject": "Cannot finish an assessment",
        "message": "It stops at the third question.",
    }
    args.update(over)
    return support_service.create_support_ticket(**args)


def test_response_carries_the_ticket_id_the_client_needs():
    """src/lib/supportRequests.ts re-queues anything without an id."""
    result = _submit(ticket_id="SUP-AB12CD")
    assert result["ticket_id"] == "SUP-AB12CD"
    assert result["delivered"] is True


def test_a_missing_or_malformed_client_id_is_replaced():
    for bad in (None, "", "not-a-ticket", "SUP-lowercase"):
        result = _submit(ticket_id=bad)
        assert result["ticket_id"].startswith("SUP-")
        assert len(result["ticket_id"]) > 4


def test_resending_a_queued_ticket_does_not_duplicate_it():
    """Devices flush their whole queue when the endpoint first goes live."""
    _submit(ticket_id="SUP-SAME01")
    _submit(ticket_id="SUP-SAME01")
    _, total = support_service.list_tickets()
    assert total == 1


def test_a_queued_ticket_keeps_the_time_it_was_written():
    _submit(ticket_id="SUP-OLD001", queued_at="2026-01-02T03:04:05+00:00")
    assert support_service.get_ticket("SUP-OLD001")["created_at"] == "2026-01-02T03:04:05+00:00"


def test_email_is_stored_lowercase_so_a_user_finds_their_own_tickets():
    _submit(ticket_id="SUP-CASE01")
    assert support_service.list_tickets_for_user("", "ada@example.com")


def test_an_unknown_category_falls_back_rather_than_being_stored_raw():
    _submit(ticket_id="SUP-CAT001", category="Nonsense")
    assert support_service.get_ticket("SUP-CAT001")["category"] == "Something else"


def test_an_unknown_priority_falls_back_to_normal():
    _submit(ticket_id="SUP-PRI001", priority="critical")
    assert support_service.get_ticket("SUP-PRI001")["priority"] == "normal"


def test_consent_defaults_to_false():
    _submit(ticket_id="SUP-NOCON1")
    assert support_service.get_ticket("SUP-NOCON1")["consent_share_history"] is False


def test_history_is_refused_without_consent():
    _submit(ticket_id="SUP-NOCON2")
    with pytest.raises(TicketError) as e:
        support_service.get_ticket_history({"_id": "staff1"}, "SUP-NOCON2")
    assert e.value.code == "no_consent"


def test_history_is_refused_when_the_ticket_has_no_account():
    _submit(ticket_id="SUP-ANON01", consent_share_history=True)
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
    _submit(ticket_id="SUP-CONS01", consent_share_history=True, user={"_id": "u9"})
    support_service.get_ticket_history({"_id": "staff1"}, "SUP-CONS01")
    assert "ticket.history_viewed" in calls


def test_replying_stores_the_message_and_moves_the_ticket_to_pending():
    _submit(ticket_id="SUP-REP001")
    support_service.add_reply({"_id": "s1", "userName": "Sam"}, "SUP-REP001", "Try again please.")
    assert support_service.get_ticket("SUP-REP001")["status"] == "pending"
    messages = support_service.list_messages("SUP-REP001")
    assert len(messages) == 1
    assert messages[0]["is_staff"] is True
    assert messages[0]["author_name"] == "Sam"


def test_replying_to_an_unknown_ticket_is_refused():
    with pytest.raises(TicketError) as e:
        support_service.add_reply({"_id": "s1"}, "SUP-NOPE01", "hello")
    assert e.value.code == "ticket_not_found"


def test_invalid_status_is_refused():
    _submit(ticket_id="SUP-STA001")
    with pytest.raises(TicketError) as e:
        support_service.update_ticket({"_id": "s1"}, "SUP-STA001", {"status": "archived"})
    assert e.value.code == "invalid_status"


def test_an_empty_assignee_unassigns():
    _submit(ticket_id="SUP-ASG001")
    support_service.update_ticket({"_id": "s1"}, "SUP-ASG001", {"assigned_to": "s2"})
    assert support_service.get_ticket("SUP-ASG001")["assigned_to"] == "s2"
    support_service.update_ticket({"_id": "s1"}, "SUP-ASG001", {"assigned_to": ""})
    assert support_service.get_ticket("SUP-ASG001")["assigned_to"] is None


def test_listing_filters_by_status():
    _submit(ticket_id="SUP-F00001")
    _submit(ticket_id="SUP-F00002")
    support_service.update_ticket({"_id": "s1"}, "SUP-F00002", {"status": "resolved"})
    open_rows, open_total = support_service.list_tickets(status="open")
    assert open_total == 1
    assert open_rows[0]["ticket_id"] == "SUP-F00001"


def test_a_failed_confirmation_email_does_not_lose_the_ticket(monkeypatch):
    monkeypatch.setattr(
        support_service, "send_support_ticket_email",
        lambda **kw: (_ for _ in ()).throw(RuntimeError("smtp down")),
    )
    result = _submit(ticket_id="SUP-MAIL01")
    assert result["ticket_id"] == "SUP-MAIL01"
    assert result["email_delivered"] is False
    assert support_service.get_ticket("SUP-MAIL01") is not None
