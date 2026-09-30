from pydantic import BaseModel
from typing import Optional

class SupportRequestPayload(BaseModel):
    name: str
    email: str
    category: str
    subject: str
    message: str
    priority: str = "normal"
    ticket_id: Optional[str] = None

class SupportRequestResponse(BaseModel):
    ticket_id: str
    msg: str = "Request received"
    status: str = "received"
    delivered: bool = True
