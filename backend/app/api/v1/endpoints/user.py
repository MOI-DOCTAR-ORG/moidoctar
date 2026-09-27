from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from app.schemas.user import UserUpdate, UserProfileResponse
from app.schemas.auth import ForgotPasswordRequest
from app.services.auth_service import update_user_profile, delete_user_account, reset_user_password
from app.services.otp_service import verify_otp
from app.services.notification_service import list_notifications, mark_all_read, dismiss_notification
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


@router.post("/uploadPhoto")
async def upload_photo(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Upload user avatar to Cloudinary (or return data URL fallback) and persist URL."""
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail={"err": "empty_file", "msg": "Uploaded file is empty"})

    import os, base64, httpx
    photo_url = None
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "ditu39hqh")
    upload_preset = os.getenv("CLOUDINARY_UPLOAD_PRESET", "moidoctar")

    if cloud_name:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(
                    f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
                    data={"upload_preset": upload_preset},
                    files={"file": (file.filename or "avatar.jpg", content, file.content_type or "image/jpeg")},
                )
                if res.status_code == 200:
                    data = res.json()
                    photo_url = data.get("secure_url") or data.get("url")
        except Exception:
            pass

    if not photo_url:
        mime = file.content_type or "image/jpeg"
        b64 = base64.b64encode(content).decode("utf-8")
        photo_url = f"data:{mime};base64,{b64}"

    try:
        updated = update_user_profile(current_user["_id"], {"photo": photo_url})
    except Exception:
        updated = current_user

    return {"msg": "Photo uploaded successfully", "data": {"photoUrl": photo_url, "user": updated}}


@router.get("/notifications")
def get_notifications(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "msg": "Notifications retrieved",
        "data": list_notifications(current_user["_id"]),
    }


@router.post("/notifications/read")
def read_all_notifications(current_user: Dict[str, Any] = Depends(get_current_user)):
    mark_all_read(current_user["_id"])
    return {"msg": "Notifications marked as read"}


@router.delete("/notifications/{notification_id}")
def remove_notification(notification_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    dismiss_notification(current_user["_id"], notification_id)
    return {"msg": "Notification dismissed"}


@router.post("/forgotPassword")
def forgot_password(req: ForgotPasswordRequest):
    if not verify_otp(req.email, "reset_password", req.verificationCode):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"err": "user_not_found", "msg": "Invalid or expired code. Please try again."},
        )
    if not reset_user_password(req.email, req.newPassword):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"err": "user_not_found", "msg": "Account not found."},
        )
    return {"msg": "Password reset successfully"}


@router.delete("")
def delete_account(current_user: Dict[str, Any] = Depends(get_current_user)):
    delete_user_account(current_user["_id"])
    return {"msg": "User account deleted successfully"}
