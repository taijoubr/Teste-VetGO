from typing import Optional
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User

def record_audit_log(
    db: Session,
    admin: User,
    action: str,
    target_user: Optional[User] = None,
    details: Optional[str] = None
) -> AuditLog:
    log = AuditLog(
        admin_id=admin.id,
        admin_name=admin.full_name,
        target_user_id=target_user.id if target_user else None,
        target_user_name=target_user.full_name if target_user else None,
        action=action,
        details=details
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
