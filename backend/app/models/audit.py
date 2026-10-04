from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    admin_name = Column(String(150), nullable=True)
    target_user_name = Column(String(150), nullable=True)
    action = Column(String(100), nullable=False, index=True) # e.g. "MANUAL_ACTIVATION", "PLAN_CHANGE", "LIFETIME_SET", "USER_BLOCK"
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
