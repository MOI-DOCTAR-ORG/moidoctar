from typing import Optional, Dict, Any, List
from pydantic import BaseModel


class Demographics(BaseModel):
    gender: Optional[str] = None
    age: Optional[str] = None
    currentCondition: Optional[str] = None
    bloodType: Optional[str] = None
    country: Optional[str] = None
    genotype: Optional[str] = None
    dateOfBirth: Optional[str] = None
    photo: Optional[str] = None
    photoUrl: Optional[str] = None


class UserPreferences(BaseModel):
    emailNotification: bool = True
    smsAlert: bool = False
    twoFactorAuth: bool = False


class NotificationItem(BaseModel):
    message: str
    date: str


class UserOut(BaseModel):
    _id: str
    userName: str
    email: str
    isVerified: bool = True
    # One of: user, staff, admin. See app/core/permissions.py.
    role: str = "user"
    isBlacklisted: bool = False
    photo: Optional[str] = None
    demographics: Optional[Demographics] = None
    phone: Optional[str] = None
    preference: Optional[UserPreferences] = None
    notifications: Optional[List[NotificationItem]] = None
    createdAt: Optional[str] = None
    lastLogin: Optional[str] = None


class UserUpdate(BaseModel):
    userName: Optional[str] = None
    phone: Optional[str] = None
    photo: Optional[str] = None
    demographics: Optional[Dict[str, Any]] = None
    preference: Optional[Dict[str, Any]] = None


class UserProfileResponse(BaseModel):
    msg: str = "User profile retrieved"
    data: UserOut
