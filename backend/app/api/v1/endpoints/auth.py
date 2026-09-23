from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status, Depends
from app.schemas.auth import (
    ManualAuthRequest,
    GoogleAuthRequest,
    VerifyEmailRequest,
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
from app.api.deps import get_current_user

router = APIRouter()


@router.post("/manualAuthentication", response_model=TokenResponse)
def manual_authentication(req: ManualAuthRequest):
    try:
        if req.type == "SIGNUP_MANUALLY":
            res = signup_user(req.email, req.password, req.fullName)
            return TokenResponse(
                msg="Account created. Check your email for a verification code.",
                authorization=res["authorization"],
                refreshToken=res["refreshToken"],
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
                "msg": "Please verify your email before signing in. We've sent a fresh code.",
                "authorization": e.authorization,
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
        res = authenticate_google(req.accessToken)
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
def verify_email(req: VerifyEmailRequest, current_user: Dict[str, Any] = Depends(get_current_user)):
    email = current_user["email"]
    if not verify_otp(email, "verify_email", req.verificationCode):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"err": "invalid_code", "msg": "Invalid or expired code. Please try again."},
        )
    mark_user_verified(current_user["_id"])
    token = create_access_token({"sub": current_user["_id"], "email": email})
    return TokenResponse(msg="Email verified successfully", authorization=token, refreshToken=token)


@router.post("/resendVerification")
def resend_verification(current_user: Dict[str, Any] = Depends(get_current_user)):
    email = current_user["email"]
    code = generate_and_store_otp(email, "verify_email")
    send_otp_email(email, code, "verify_email")
    return {"msg": "Verification code resent"}


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
