from datetime import datetime, date, time, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User, UserRole, SubscriptionPlan, SubscriptionStatus
from app.models.tutor import Tutor
from app.models.patient import Patient, Species, PatientGender
from app.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.models.financial import FinancialEntry, FinancialType, PaymentMethod, FinancialStatus
from app.models.inventory import InventoryItem, InventoryItemType
from app.models.audit import AuditLog

def init_db(db: Session) -> None:
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    # Check if primary admin exists
    admin = db.query(User).filter(User.email == "ncodestechnologies@gmail.com").first()
    if not admin:
        admin = User(
            email="ncodestechnologies@gmail.com",
            hashed_password=get_password_hash("Taijou13!"),
            first_name="Programador",
            last_name="NCodes Technologies",
            role=UserRole.ADMIN,
            plan=SubscriptionPlan.PRO,
            is_lifetime=True,
            subscription_status=SubscriptionStatus.ACTIVE,
            phone="(11) 99999-0000"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Primary admin initialized: ncodestechnologies@gmail.com")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
