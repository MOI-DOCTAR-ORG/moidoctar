from typing import Optional, Literal
from pydantic import BaseModel


class ManualAuthRequest(BaseModel):
    type: Literal["SIGNIN_MANUALLY", "SIGNUP_MANUALLY"]
    email: str
    password: str
    fullName: Optional[str] = None


class GoogleAuthRequest(BaseModel):
    accessToken: str
    tokenType: str = "id_token"  # "id_token" (GoogleLogin) or "access_token" (custom button)


class VerifyEmailRequest(BaseModel):
    verificationCode: str
    email: Optional[str] = None


class ResendVerificationRequest(BaseModel):
    email: Optional[str] = None


class RequestPasswordResetRequest(BaseModel):
    email: str


class ForgotPasswordRequest(BaseModel):
    email: str
    verificationCode: str
    newPassword: str


class TokenResponse(BaseModel):
    msg: Optional[str] = "Success"
    authorization: str
    refreshToken: str
    dev_code: Optional[str] = None
    email_delivered: Optional[bool] = None
    email_error: Optional[str] = None

