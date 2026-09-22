from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import UserUpdate, UserProfileResponse
from app.schemas.auth import ForgotPasswordRequest
from app.services.auth_service import update_user_profile, delete_user_account
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/listData", response_model=UserProfileResponse)
def get_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return UserProfileResponse(msg="User profile retrieved", data=current_user)


@router.put("/updateProfile", response_model=UserProfileResponse)
def update_profile(
    updates: UserUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    try:
        updated = update_user_profile(current_user["_id"], updates.model_dump(exclude_unset=True))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail={"err": "user_not_found", "msg": "User account could not be found"})
    return UserProfileResponse(msg="Profile updated successfully", data=updated)


@router.get("/notifications")
def get_notifications(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "msg": "Notifications retrieved",
        "data": current_user.get("notifications") or [],
    }


@router.post("/forgotPassword")
def forgot_password(req: ForgotPasswordRequest):
    return {"msg": "Password reset successfully"}


@router.delete("")
def delete_account(current_user: Dict[str, Any] = Depends(get_current_user)):
    delete_user_account(current_user["_id"])
    return {"msg": "User account deleted successfully"}
