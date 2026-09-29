from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SupportRequestIn(BaseModel):
    """What the Support page posts.

    `ticket_id` is generated client-side so a person always has a reference to
    quote, even when delivery failed and the request sat in their browser
    queue. The server honours it when it looks sane and mints its own if not.
    """

    name: str = Field(..., min_length=1, max_length=120)
    # Plain str, not EmailStr: pydantic's email type needs the email-validator
    # package, which this backend does not ship, and a strict format check
    # would turn an unusual-but-valid address into a 422 for someone who is
    # already locked out and asking for help. Delivery failure is reported
    # honestly at reply time instead.
    email: str = Field(..., min_length=3, max_length=254)
    category: str = Field(..., max_length=80)
    subject: str = Field(..., min_length=1, max_length=200)
    message: str = Field(..., min_length=1, max_length=8000)
    priority: str = Field(default="normal")
    ticket_id: Optional[str] = Field(default=None, max_length=40)
    # The user's explicit permission for support to read their triage history
    # for this ticket. Defaults to False: silence is not consent.
    consent_share_history: bool = False
    # Set by the client for a request that sat in the local queue, so the
    # ticket keeps the time it was written rather than the time it arrived.
    queued_at: Optional[str] = None


class SupportRequestOut(BaseModel):
    # The frontend treats a response as delivered only when it carries this.
    ticket_id: str
    status: str
    created_at: str


class TicketMessage(BaseModel):
    id: str
    ticket_id: str
    body: str
    is_staff: bool
    author_id: Optional[str] = None
    author_name: Optional[str] = None
    created_at: str


class Ticket(BaseModel):
    ticket_id: str
    user_id: Optional[str] = None
    name: str
    email: str
    category: str
    subject: str
    message: str
    priority: str
    status: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    consent_share_history: bool = False
    created_at: str
    updated_at: str


class TicketDetail(Ticket):
    messages: List[TicketMessage] = []


class TicketListOut(BaseModel):
    msg: str
    data: List[Ticket]
    total: int


class ReplyIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=8000)


class TicketPatchIn(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    # Explicit empty string unassigns; omitted leaves the assignee alone.
    assigned_to: Optional[str] = None


class TicketHistoryOut(BaseModel):
    msg: str
    data: Dict[str, Any]
