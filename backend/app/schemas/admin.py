from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole, SubscriptionPlan, SubscriptionStatus

class AdminUserItem(BaseModel):
    id: int
    email: EmailStr
    first_name: str
    last_name: str
    crmv: Optional[str] = None
    crmv_uf: Optional[str] = None
    phone: Optional[str] = None
    role: UserRole
    plan: SubscriptionPlan
    subscription_status: SubscriptionStatus
    is_lifetime: bool
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    tutors_count: int
    patients_count: int

    class Config:
        from_attributes = True

class AdminSubscriptionUpdate(BaseModel):
    plan: Optional[SubscriptionPlan] = None
    subscription_status: Optional[SubscriptionStatus] = None
    is_lifetime: Optional[bool] = None
    subscription_end: Optional[datetime] = None
    admin_notes: Optional[str] = None
    origin: Optional[str] = "ADMIN_MANUAL"

class AdminAuditLogItem(BaseModel):
    id: int
    admin_name: Optional[str] = None
    target_user_name: Optional[str] = None
    action: str
    details: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class AdminStatsResponse(BaseModel):
    total_users: int
    total_vets: int
    total_free_users: int
    total_pro_users: int
    total_lifetime_users: int
    total_active_subscriptions: int
