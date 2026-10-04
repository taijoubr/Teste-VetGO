from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException
from app.core.database import Base
from app.models.user import User, UserRole, SubscriptionPlan, SubscriptionStatus
from app.models.tutor import Tutor
from app.models.patient import Patient, Species, PatientGender
from app.services.plan_service import check_can_add_tutor, check_can_add_patient, get_user_plan_usage
from app.core.security import get_password_hash, verify_password

def setup_in_memory_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestingSessionLocal()

def test_password_hash():
    pwd = "SecretPassword123"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_free_plan_tutor_limit_counts_inactive():
    db = setup_in_memory_db()
    vet = User(
        email="vet1@vetgo.com.br",
        hashed_password="hash",
        first_name="Vet",
        last_name="One",
        role=UserRole.VET,
        plan=SubscriptionPlan.FREE,
        subscription_status=SubscriptionStatus.ACTIVE,
        is_lifetime=False
    )
    db.add(vet)
    db.commit()
    db.refresh(vet)

    # Add 25 active tutors and 5 inactive tutors = 30 total
    for i in range(25):
        t = Tutor(owner_id=vet.id, name=f"Tutor Active {i}", is_active=True)
        db.add(t)
    for i in range(5):
        t = Tutor(owner_id=vet.id, name=f"Tutor Inactive {i}", is_active=False)
        db.add(t)
    db.commit()

    # Rule 42: Total registrations count, INCLUDING inactive!
    usage = get_user_plan_usage(db, vet)
    assert usage["tutors_count"] == 30
    assert usage["tutors_limit_reached"] is True

    # Attempting to add 31st tutor must raise 403 HTTPException
    try:
        check_can_add_tutor(db, vet)
        assert False, "Should have raised HTTPException for tutor limit"
    except HTTPException as e:
        assert e.status_code == 403
        assert "Limite do plano gratuito atingido (30 tutores" in e.detail

def test_pro_plan_removes_limit():
    db = setup_in_memory_db()
    vet = User(
        email="vet_pro@vetgo.com.br",
        hashed_password="hash",
        first_name="Vet",
        last_name="Pro",
        role=UserRole.VET,
        plan=SubscriptionPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        is_lifetime=False,
        subscription_end=datetime.now(timezone.utc) + timedelta(days=30)
    )
    db.add(vet)
    db.commit()
    db.refresh(vet)

    # Add 35 tutors
    for i in range(35):
        t = Tutor(owner_id=vet.id, name=f"Tutor {i}", is_active=True)
        db.add(t)
    db.commit()

    # Should not raise exception
    check_can_add_tutor(db, vet)
    usage = get_user_plan_usage(db, vet)
    assert usage["tutors_count"] == 35
    assert usage["tutors_limit"] is None
    assert usage["tutors_limit_reached"] is False

def test_lifetime_plan_never_expires():
    db = setup_in_memory_db()
    vet = User(
        email="vet_life@vetgo.com.br",
        hashed_password="hash",
        first_name="Vet",
        last_name="Lifetime",
        role=UserRole.VET,
        plan=SubscriptionPlan.PRO,
        subscription_status=SubscriptionStatus.ACTIVE,
        is_lifetime=True,
        subscription_end=None
    )
    db.add(vet)
    db.commit()
    db.refresh(vet)

    # Add 60 patients
    tutor = Tutor(owner_id=vet.id, name="Tutor Lifetime", is_active=True)
    db.add(tutor)
    db.commit()
    db.refresh(tutor)

    for i in range(60):
        p = Patient(
            owner_id=vet.id,
            tutor_id=tutor.id,
            name=f"Patient {i}",
            species=Species.CANINA,
            gender=PatientGender.MACHO
        )
        db.add(p)
    db.commit()

    # Lifetime account has no limits
    check_can_add_patient(db, vet)
    usage = get_user_plan_usage(db, vet)
    assert usage["is_lifetime"] is True
    assert usage["patients_limit"] is None
    assert usage["patients_limit_reached"] is False

def test_multi_tenant_isolation():
    db = setup_in_memory_db()
    vet_a = User(
        email="vet_a@vetgo.com.br",
        hashed_password="hash",
        first_name="Vet",
        last_name="A",
        role=UserRole.VET,
        plan=SubscriptionPlan.FREE
    )
    vet_b = User(
        email="vet_b@vetgo.com.br",
        hashed_password="hash",
        first_name="Vet",
        last_name="B",
        role=UserRole.VET,
        plan=SubscriptionPlan.FREE
    )
    db.add_all([vet_a, vet_b])
    db.commit()
    db.refresh(vet_a)
    db.refresh(vet_b)

    tutor_a = Tutor(owner_id=vet_a.id, name="Tutor of Vet A")
    tutor_b = Tutor(owner_id=vet_b.id, name="Tutor of Vet B")
    db.add_all([tutor_a, tutor_b])
    db.commit()

    # Vet A queries only their tutors
    tutors_a = db.query(Tutor).filter(Tutor.owner_id == vet_a.id).all()
    assert len(tutors_a) == 1
    assert tutors_a[0].name == "Tutor of Vet A"

    # Vet B queries only their tutors
    tutors_b = db.query(Tutor).filter(Tutor.owner_id == vet_b.id).all()
    assert len(tutors_b) == 1
    assert tutors_b[0].name == "Tutor of Vet B"

def test_patient_limit_free_plan_counts_inactive():
    db = setup_in_memory_db()
    vet = User(
        email="vet_patient_limit@vetgo.com.br",
        hashed_password="hash",
        first_name="Vet",
        last_name="Patient",
        role=UserRole.VET,
        plan=SubscriptionPlan.FREE,
        subscription_status=SubscriptionStatus.ACTIVE,
        is_lifetime=False
    )
    db.add(vet)
    db.commit()
    db.refresh(vet)

    tutor = Tutor(owner_id=vet.id, name="Tutor Test", is_active=True)
    db.add(tutor)
    db.commit()
    db.refresh(tutor)

    # Add 40 active and 10 inactive patients = 50 total
    for i in range(40):
        p = Patient(owner_id=vet.id, tutor_id=tutor.id, name=f"Patient {i}", is_active=True)
        db.add(p)
    for i in range(10):
        p = Patient(owner_id=vet.id, tutor_id=tutor.id, name=f"Patient Inact {i}", is_active=False)
        db.add(p)
    db.commit()

    usage = get_user_plan_usage(db, vet)
    assert usage["patients_count"] == 50
    assert usage["patients_limit_reached"] is True

    try:
        check_can_add_patient(db, vet)
        assert False, "Should have raised HTTPException for patient limit"
    except HTTPException as e:
        assert e.status_code == 403
        assert "Limite do plano gratuito atingido (50 pacientes" in e.detail

def test_financial_amount_decimal_precision():
    from decimal import Decimal
    from app.models.financial import FinancialEntry, FinancialType, PaymentMethod, FinancialStatus
    from datetime import date
    db = setup_in_memory_db()
    vet = User(email="vet_money@vetgo.com.br", hashed_password="h", first_name="V", last_name="M", role=UserRole.VET)
    db.add(vet)
    db.commit()
    db.refresh(vet)

    entry = FinancialEntry(
        owner_id=vet.id,
        description="Consulta Domiciliar",
        entry_type=FinancialType.RECEITA,
        category="Consulta",
        amount=Decimal("250.75"),
        due_date=date.today(),
        status=FinancialStatus.PAGO
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    assert isinstance(entry.amount, Decimal)
    assert entry.amount == Decimal("250.75")

if __name__ == "__main__":
    test_password_hash()
    test_free_plan_tutor_limit_counts_inactive()
    test_pro_plan_removes_limit()
    test_lifetime_plan_never_expires()
    test_multi_tenant_isolation()
    test_patient_limit_free_plan_counts_inactive()
    test_financial_amount_decimal_precision()
    print("ALL CORE RULES AND TESTS PASSED SUCCESSFULLY!")

