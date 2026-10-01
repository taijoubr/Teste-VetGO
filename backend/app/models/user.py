import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    VET = "VET"
    ADMIN = "ADMIN"

class SubscriptionPlan(str, enum.Enum):
    FREE = "FREE"
    PRO = "PRO"

class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    whatsapp = Column(String(30), nullable=True)
    crmv = Column(String(50), nullable=True)
    crmv_uf = Column(String(2), nullable=True)
    clinic_name = Column(String(150), nullable=True)
    logo_url = Column(Text, nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.VET, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Subscription details
    plan = Column(SQLEnum(SubscriptionPlan), default=SubscriptionPlan.FREE, nullable=False)
    subscription_status = Column(SQLEnum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    subscription_origin = Column(String(100), default="AUTONOMO_CADASTRO", nullable=True)
    is_lifetime = Column(Boolean, default=False, nullable=False)
    subscription_start = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)
    subscription_end = Column(DateTime, nullable=True)
    admin_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    tutors = relationship("Tutor", back_populates="owner", cascade="all, delete-orphan")
    patients = relationship("Patient", back_populates="owner", cascade="all, delete-orphan")
    appointments = relationship("Appointment", back_populates="owner", cascade="all, delete-orphan")
    financial_entries = relationship("FinancialEntry", back_populates="owner", cascade="all, delete-orphan")
    inventory_items = relationship("InventoryItem", back_populates="owner", cascade="all, delete-orphan")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()
