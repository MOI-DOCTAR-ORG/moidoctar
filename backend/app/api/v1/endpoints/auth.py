from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.auth import (
    ManualAuthRequest,
    GoogleAuthRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    RequestPasswordResetRequest,
    TokenResponse,
)
from app.services.auth_service import (
    signup_user,
    authenticate_user,
    authenticate_google,
    AccountNotVerifiedError,
    get_user_by_email,
    mark_user_verified,
)
from app.services.otp_service import generate_and_store_otp, verify_otp
from app.core.email import send_otp_email
from app.core.security import create_access_token
from app.core.config import settings
from app.api.deps import get_current_user, get_optional_current_user

router = APIRouter()


@router.post("/manualAuthentication", response_model=TokenResponse)
def manual_authentication(req: ManualAuthRequest):
    try:
        if req.type == "SIGNUP_MANUALLY":
            res = signup_user(req.email, req.password, req.fullName)
            email_delivered = res.get("email_delivered", False)
            email_status = res.get("email_status", "")
            return TokenResponse(
                msg="Account created. Check your email for a verification code." if email_delivered else f"Account created. ({email_status})",
                authorization=res["authorization"],
                refreshToken=res["refreshToken"],
                dev_code=res.get("dev_code"),
                email_delivered=email_delivered,
                email_error=None if email_delivered else email_status,
            )
        else:
            res = authenticate_user(req.email, req.password)
            return TokenResponse(
                msg="Signed in successfully",
                authorization=res["authorization"],
                refreshToken=res["refreshToken"],
            )
    except AccountNotVerifiedError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "err": "account_not_verified",
                "msg": "Please verify your email before signing in. Check your inbox for your code." if e.email_delivered else f"Please verify your email. ({e.email_error or 'Code generated'})",
                "authorization": e.authorization,
                "dev_code": e.code,
                "email_delivered": e.email_delivered,
                "email_error": e.email_error,
            },
        )
    except ValueError as e:
        err_msg = str(e)
        if err_msg == "account_exist":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"err": "account_exist", "msg": "Account already exists"})
        elif err_msg == "invalid_account":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"err": "invalid_account", "msg": "Invalid email or password"})
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"err": "auth_failed", "msg": str(e)})
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"err": "server_error", "msg": str(e), "traceback": traceback.format_exc()}
        )


@router.get("/debug")
def debug_auth(email: str = None):
    from app.core.supabase import get_supabase_client
    from app.services.auth_service import _local_users
    supabase = get_supabase_client()
    if not supabase:
        return {"mode": "local_fallback", "users_count": len(_local_users)}
    try:
        if email:
            query = supabase.table("users").select("*").eq("email", email.strip().lower()).execute()
        else:
            query = supabase.table("users").select("id, email, user_name, created_at").limit(5).execute()
        return {
            "mode": "supabase",
            "count": len(query.data) if query.data else 0,
            "data": query.data,
        }
    except Exception as e:
        import traceback
        return {"mode": "supabase_error", "error": str(e), "traceback": traceback.format_exc()}


@router.post("/google", response_model=TokenResponse)
def google_authentication(req: GoogleAuthRequest):
    try:
        res = authenticate_google(req.accessToken, req.tokenType)
        return TokenResponse(
            msg="Google authentication successful",
            authorization=res["authorization"],
            refreshToken=res["refreshToken"],
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"err": "invalid_google_token", "msg": "Google sign-in failed. Please try again or use email login."},
        )


@router.post("/verify", response_model=TokenResponse)
def verify_email(
    req: VerifyEmailRequest,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    email = (req.email or "").strip().lower() if req.email else None
    user_id = None
    if current_user:
        email = current_user.get("email") or email
        user_id = current_user.get("_id") or current_user.get("id")
    elif email:
        user = get_user_by_email(email)
        if user:
            user_id = user.get("id") or user.get("_id")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"err": "not_authenticated", "msg": "Session expired or email missing. Please sign in again."},
        )

    if not verify_otp(email, "verify_email", req.verificationCode):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"err": "invalid_code", "msg": "Invalid or expired code. Please try again."},
        )

    if not user_id and email:
        user = get_user_by_email(email)
        if user:
            user_id = user.get("id") or user.get("_id")

    mark_user_verified(user_id=user_id, email=email)
    sub_id = user_id or "verified"
    token = create_access_token({"sub": str(sub_id), "email": email})

    return TokenResponse(
        msg="Email verified successfully",
        authorization=token,
        refreshToken=token,
        email_delivered=True,
    )


@router.post("/resendVerification")
def resend_verification(
    req: Optional[ResendVerificationRequest] = None,
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_current_user),
):
    email = None
    if current_user and current_user.get("email"):
        email = current_user["email"]
    elif req and req.email:
        email = req.email.strip().lower()

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"err": "missing_email", "msg": "Please provide your email address or sign in to resend code."},
        )

    code = generate_and_store_otp(email, "verify_email")
    ok, email_status = send_otp_email(email, code, "verify_email")
    return {
        "msg": "Verification code resent to your email" if ok else f"Verification code generated ({email_status})",
        "dev_code": code,
        "email_delivered": ok,
        "email_status": email_status,
    }


@router.get("/test-resend")
def test_resend(to: str = "lateefedidi4@gmail.com"):
    from app.core.email import _send_via_resend
    ok, detail = _send_via_resend(to, "MoiDoctar Resend Test", "<p>Test email from MoiDoctar</p>", "Test email from MoiDoctar")
    key = settings.effective_resend_api_key
    return {
        "ok": ok,
        "detail": detail,
        "has_api_key": bool(key),
        "key_prefix": (key[:6] + "...") if key else None,
        "from": settings.effective_resend_from,
        "to": to,
    }


@router.get("/test-smtp")
def test_smtp(to: str = "lateefedidi4@gmail.com"):
    import os
    import socket
    import app.core.email as email_mod
    from app.core.email import _send_via_smtp, _smtp_configured

    # Reset circuit breaker so testing is never blocked
    email_mod._smtp_circuit_broken_until = 0.0

    configured = _smtp_configured()
    smtp_env_vars = [k for k in os.environ.keys() if any(term in k.upper() for term in ["SMTP", "MAIL", "GMAIL", "EMAIL"])]
    resolved_ipv4 = []
    try:
        infos = socket.getaddrinfo(settings.effective_smtp_host, settings.effective_smtp_port, socket.AF_INET, socket.SOCK_STREAM)
        resolved_ipv4 = list({ai[4][0] for ai in infos})
    except Exception as e:
        resolved_ipv4 = [f"DNS error: {e}"]

    if not configured:
        return {
            "ok": False,
            "configured": False,
            "detail": "SMTP credentials not configured (set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in environment)",
            "host": settings.effective_smtp_host,
            "user": settings.effective_smtp_user,
            "port": settings.effective_smtp_port,
            "use_ssl": settings.effective_smtp_use_ssl,
            "use_tls": settings.effective_smtp_use_tls,
            "has_password": bool(settings.effective_smtp_password),
            "detected_smtp_env_vars": smtp_env_vars,
            "resolved_ipv4": resolved_ipv4,
        }

    ok, detail = _send_via_smtp(to, "MoiDoctar SMTP Test", "<p>Test email from MoiDoctar via SMTP</p>", "Test email from MoiDoctar via SMTP")
    return {
        "ok": ok,
        "configured": True,
        "detail": detail,
        "host": settings.effective_smtp_host,
        "user": settings.effective_smtp_user,
        "port": settings.effective_smtp_port,
        "use_ssl": settings.effective_smtp_use_ssl,
        "use_tls": settings.effective_smtp_use_tls,
        "from": settings.effective_smtp_from,
        "to": to,
        "resolved_ipv4": resolved_ipv4,
        "detected_smtp_env_vars": smtp_env_vars,
    }


@router.get("/test-emailjs")
def test_emailjs(to: str = "lateefedidi4@gmail.com"):
    """Test sending an email directly via EmailJS REST API."""
    from app.core.email import _send_via_emailjs
    service_id = settings.effective_emailjs_service_id
    template_id = settings.effective_emailjs_template_id
    public_key = settings.effective_emailjs_public_key
    if not (service_id and template_id and public_key):
        return {
            "ok": False,
            "configured": False,
            "detail": "EmailJS is not fully configured (set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY in environment)",
            "to": to,
        }
    ok, detail = _send_via_emailjs(to, "MoiDoctar EmailJS Test", "<p>Test email from MoiDoctar via EmailJS</p>", "Test email from MoiDoctar via EmailJS", code="123456")
    return {
        "ok": ok,
        "configured": True,
        "detail": detail,
        "service_id": service_id,
        "template_id": template_id,
        "to": to,
    }


@router.get("/test-brevo")
def test_brevo(to: str = "lateefedidi4@gmail.com"):
    """Test sending an email directly via Brevo's HTTPS REST API."""
    from app.core.email import _send_via_brevo
    key = settings.effective_brevo_api_key
    if not key:
        return {
            "ok": False,
            "configured": False,
            "detail": "BREVO_API_KEY is not set in environment variables.",
            "to": to,
        }
    ok, detail = _send_via_brevo(to, "MoiDoctar Brevo Test", "<p>Test email from MoiDoctar via Brevo</p>", "Test email from MoiDoctar via Brevo")
    return {
        "ok": ok,
        "configured": True,
        "detail": detail,
        "from_email": settings.effective_brevo_from_email,
        "from_name": settings.effective_brevo_from_name,
        "to": to,
    }


@router.get("/test-email")
def test_email(to: str = "lateefedidi4@gmail.com"):
    """Comprehensive test endpoint to diagnose which provider is selected and test real delivery."""
    from app.core.email import send_otp_email, _smtp_configured
    ok, detail = send_otp_email(to, "123456", "verify_email")
    return {
        "ok": ok,
        "detail": detail,
        "recipient": to,
        "provider_preference": settings.email_provider_preference,
        "emailjs": {
            "configured": bool(settings.effective_emailjs_service_id and settings.effective_emailjs_public_key),
            "service_id": settings.effective_emailjs_service_id,
            "template_id": settings.effective_emailjs_template_id,
        },
        "brevo": {
            "configured": bool(settings.effective_brevo_api_key),
            "from_email": settings.effective_brevo_from_email,
            "from_name": settings.effective_brevo_from_name,
        },
        "resend": {
            "configured": bool(settings.effective_resend_api_key),
            "from": settings.effective_resend_from,
            "is_sandbox": "onboarding@resend.dev" in settings.effective_resend_from.lower(),
        },
        "smtp": {
            "configured": _smtp_configured(),
            "host": settings.effective_smtp_host,
            "user": settings.effective_smtp_user,
            "port": settings.effective_smtp_port,
            "use_ssl": settings.effective_smtp_use_ssl,
            "use_tls": settings.effective_smtp_use_tls,
            "from": settings.effective_smtp_from,
            "has_password": bool(settings.effective_smtp_password),
        },
    }




@router.post("/logout")
def logout():
    return {"msg": "Logged out successfully"}


@router.post("/requestPasswordReset")
def request_password_reset(req: RequestPasswordResetRequest):
    # Look the account up but always return the same generic response,
    # whether or not the email is registered, so this endpoint can't be
    # used to enumerate accounts. Only a *real* account actually gets an
    # email/OTP generated.
    user = get_user_by_email(req.email)
    if user:
        code = generate_and_store_otp(user["email"], "reset_password")
        send_otp_email(user["email"], code, "reset_password")
    return {"msg": "If an account exists for this email, a reset code has been sent."}
