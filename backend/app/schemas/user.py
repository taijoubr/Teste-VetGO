from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole, SubscriptionPlan, SubscriptionStatus

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    crmv: Optional[str] = None
    crmv_uf: Optional[str] = None
    clinic_name: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    crmv: Optional[str] = None
    crmv_uf: Optional[str] = None
    clinic_name: Optional[str] = None
    logo_url: Optional[str] = None

    model_config = {"extra": "ignore"}

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserResponse(UserBase):
    id: int
    role: UserRole
    is_active: bool
    logo_url: Optional[str] = None
    plan: SubscriptionPlan
    subscription_status: SubscriptionStatus
    is_lifetime: bool
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

Token.model_rebuild()
