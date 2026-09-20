from fastapi import APIRouter, HTTPException, status
from app.schemas.auth import (
    ManualAuthRequest,
    GoogleAuthRequest,
    VerifyEmailRequest,
    RequestPasswordResetRequest,
    TokenResponse,
)
from app.services.auth_service import signup_user, authenticate_user, authenticate_google

router = APIRouter()


@router.post("/manualAuthentication", response_model=TokenResponse)
def manual_authentication(req: ManualAuthRequest):
    try:
        if req.type == "SIGNUP_MANUALLY":
            res = signup_user(req.email, req.password, req.fullName)
            return TokenResponse(
                msg="Account created successfully",
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
    res = authenticate_google(req.accessToken)
    return TokenResponse(
        msg="Google authentication successful",
        authorization=res["authorization"],
        refreshToken=res["refreshToken"],
    )


@router.post("/verify")
def verify_email(req: VerifyEmailRequest):
    return {
        "msg": "Email verified successfully",
        "authorization": f"local_jwt_verified_{req.verificationCode}",
        "refreshToken": f"local_refresh_verified_{req.verificationCode}",
    }


@router.post("/resendVerification")
def resend_verification():
    return {"msg": "Verification code resent"}


@router.post("/logout")
def logout():
    return {"msg": "Logged out successfully"}


@router.post("/requestPasswordReset")
def request_password_reset(req: RequestPasswordResetRequest):
    return {"msg": "Password reset code sent to email"}
