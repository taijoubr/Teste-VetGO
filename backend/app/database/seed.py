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
    
    # Check if admin exists
    admin = db.query(User).filter(User.email == "admin@vetgo.com.br").first()
    if not admin:
        admin = User(
            email="admin@vetgo.com.br",
            hashed_password=get_password_hash("Admin@123456"),
            first_name="Administrador",
            last_name="Vetgo",
            role=UserRole.ADMIN,
            plan=SubscriptionPlan.PRO,
            is_lifetime=True,
            subscription_status=SubscriptionStatus.ACTIVE,
            phone="(11) 99999-0000"
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print("Admin user created: admin@vetgo.com.br / Admin@123456")

    # Check if demo vet exists
    vet = db.query(User).filter(User.email == "dra.carolina@vetgo.com.br").first()
    if not vet:
        vet = User(
            email="dra.carolina@vetgo.com.br",
            hashed_password=get_password_hash("Vet@123456"),
            first_name="Carolina",
            last_name="Mendes",
            crmv="34892",
            crmv_uf="SP",
            phone="(11) 98765-4321",
            whatsapp="(11) 98765-4321",
            clinic_name="Dra. Carolina Mendes - Atendimento Volante & Domiciliar",
            role=UserRole.VET,
            plan=SubscriptionPlan.FREE,
            subscription_status=SubscriptionStatus.ACTIVE,
            is_lifetime=False
        )
        db.add(vet)
        db.commit()
        db.refresh(vet)
        print("Demo Vet created: dra.carolina@vetgo.com.br / Vet@123456")

        # Seed Tutors
        tutor1 = Tutor(
            owner_id=vet.id,
            name="Mariana Silveira Ramos",
            cpf="215.438.990-12",
            phone="(11) 97123-4567",
            whatsapp="(11) 97123-4567",
            email="mariana.silveira@exemplo.com",
            address="Rua Oscar Freire",
            address_number="1420",
            complement="Apto 52",
            neighborhood="Cerqueira César",
            city="São Paulo",
            state="SP",
            postal_code="01426-001",
            notes="Tutor muito atenciosa. Cão com histórico de dermatite alérgica.",
            is_active=True
        )
        tutor2 = Tutor(
            owner_id=vet.id,
            name="Carlos Eduardo Prado",
            cpf="319.824.110-44",
            phone="(11) 98234-5678",
            whatsapp="(11) 98234-5678",
            email="carlos.prado@exemplo.com",
            address="Alameda dos Maracatins",
            address_number="890",
            neighborhood="Moema",
            city="São Paulo",
            state="SP",
            postal_code="04089-012",
            notes="Prefere atendimentos domiciliares no final da tarde.",
            is_active=True
        )
        tutor3 = Tutor(
            owner_id=vet.id,
            name="Fernanda Albuquerque Lima",
            cpf="112.334.556-78",
            phone="(11) 99345-6789",
            whatsapp="(11) 99345-6789",
            email="fernanda.lima@exemplo.com",
            address="Rua Pamplona",
            address_number="350",
            neighborhood="Jardim Paulista",
            city="São Paulo",
            state="SP",
            postal_code="01405-000",
            notes="Possui uma gata e um coelho.",
            is_active=True
        )
        db.add_all([tutor1, tutor2, tutor3])
        db.commit()
        db.refresh(tutor1)
        db.refresh(tutor2)
        db.refresh(tutor3)

        # Seed Patients
        p1 = Patient(
            owner_id=vet.id,
            tutor_id=tutor1.id,
            name="Thor",
            species=Species.CANINA,
            breed="Golden Retriever",
            gender=PatientGender.MACHO,
            birth_date=date(2021, 6, 15),
            approximate_age="5 anos",
            weight_kg=34.5,
            coat_color="Dourado Claro",
            is_neutered=True,
            microchip="981098102391201",
            notes="Animal dócil. Alérgico a picada de pulgas."
        )
        p2 = Patient(
            owner_id=vet.id,
            tutor_id=tutor2.id,
            name="Mel",
            species=Species.FELINA,
            breed="SRD (Frajola)",
            gender=PatientGender.FEMEA,
            birth_date=date(2023, 2, 10),
            approximate_age="3 anos",
            weight_kg=4.2,
            coat_color="Preto e Branco",
            is_neutered=True,
            notes="FIV/FeLV negativos. Vacinação V5 em dia."
        )
        p3 = Patient(
            owner_id=vet.id,
            tutor_id=tutor3.id,
            name="Paçoca",
            species=Species.CANINA,
            breed="Spitz Alemão (Lulu da Pomerânia)",
            gender=PatientGender.MACHO,
            birth_date=date(2024, 1, 20),
            approximate_age="2 anos",
            weight_kg=3.1,
            coat_color="Laranja",
            is_neutered=False,
            notes="Acompanhamento preventivo e profilaxia dental."
        )
        p4 = Patient(
            owner_id=vet.id,
            tutor_id=tutor3.id,
            name="Pipoca",
            species=Species.LAGOMORFA,
            breed="Mini Lionhead",
            gender=PatientGender.FEMEA,
            birth_date=date(2024, 8, 5),
            approximate_age="1 ano",
            weight_kg=1.4,
            coat_color="Branco e Cinza",
            is_neutered=True,
            notes="Coelho de estimação. Monitorar desgaste dos dentes incisivos."
        )
        db.add_all([p1, p2, p3, p4])
        db.commit()
        db.refresh(p1)
        db.refresh(p2)
        db.refresh(p3)
        db.refresh(p4)

        # Seed Appointments for Today
        now = datetime.now(timezone.utc)
        today = date.today()
        
        appt1 = Appointment(
            owner_id=vet.id,
            tutor_id=tutor1.id,
            patient_id=p1.id,
            date_time=datetime.combine(today, time(10, 30)),
            duration_minutes=60,
            address="Rua Oscar Freire, 1420 - Apto 52",
            appointment_type=AppointmentType.DOMICILIAR,
            status=AppointmentStatus.CONFIRMADO,
            reason="Consulta dermatológica e coleta de raspado de pele",
            notes="Levar kit de coleta citológica e lâminas."
        )
        appt2 = Appointment(
            owner_id=vet.id,
            tutor_id=tutor2.id,
            patient_id=p2.id,
            date_time=datetime.combine(today, time(15, 0)),
            duration_minutes=45,
            address="Alameda dos Maracatins, 890",
            appointment_type=AppointmentType.DOMICILIAR,
            status=AppointmentStatus.AGENDADO,
            reason="Aplicação de reforço anual de vacina V5 e antirrábica",
            notes="Manter caixa de transporte protegida."
        )
        appt3 = Appointment(
            owner_id=vet.id,
            tutor_id=tutor3.id,
            patient_id=p3.id,
            date_time=datetime.combine(today + timedelta(days=2), time(14, 0)),
            duration_minutes=60,
            address="Rua Pamplona, 350",
            appointment_type=AppointmentType.DOMICILIAR,
            status=AppointmentStatus.AGENDADO,
            reason="Avaliação de claudicação em membro pélvico esquerdo"
        )
        db.add_all([appt1, appt2, appt3])

        # Seed Financial Transactions
        f1 = FinancialEntry(
            owner_id=vet.id,
            description="Atendimento Domiciliar + Medicação - Thor",
            entry_type=FinancialType.RECEITA,
            category="Consulta",
            amount=Decimal("280.00"),
            due_date=today,
            payment_date=today,
            payment_method=PaymentMethod.PIX,
            status=FinancialStatus.PAGO,
            tutor_id=tutor1.id,
            patient_id=p1.id
        )
        f2 = FinancialEntry(
            owner_id=vet.id,
            description="Vacinação V5 Felina Domiciliar - Mel",
            entry_type=FinancialType.RECEITA,
            category="Vacina",
            amount=Decimal("195.00"),
            due_date=today,
            payment_method=PaymentMethod.PIX,
            status=FinancialStatus.PENDENTE,
            tutor_id=tutor2.id,
            patient_id=p2.id
        )
        f3 = FinancialEntry(
            owner_id=vet.id,
            description="Combustível e Deslocamento Semanal",
            entry_type=FinancialType.DESPESA,
            category="Combustível / Deslocamento",
            amount=Decimal("150.00"),
            due_date=today - timedelta(days=2),
            payment_date=today - timedelta(days=2),
            payment_method=PaymentMethod.CARTAO_DEBITO,
            status=FinancialStatus.PAGO
        )
        db.add_all([f1, f2, f3])

        # Seed Inventory
        inv1 = InventoryItem(
            owner_id=vet.id,
            item_type=InventoryItemType.MEDICAMENTO,
            name="Zoletil 50",
            active_ingredient="Tiletamina + Zolazepam",
            presentation="Frasco ampola 5ml",
            concentration="50mg/ml",
            unit="frasco",
            stock_quantity=2.0,
            min_stock=4.0,  # Below min stock!
            cost_price=Decimal("120.00"),
            sale_price=Decimal("190.00"),
            supplier_name="Distribuidora VetBrasil"
        )
        inv2 = InventoryItem(
            owner_id=vet.id,
            item_type=InventoryItemType.MEDICAMENTO,
            name="Meloxicam Injetável 0.2%",
            active_ingredient="Meloxicam",
            presentation="Frasco 20ml",
            concentration="2mg/ml",
            unit="frasco",
            stock_quantity=8.0,
            min_stock=3.0,
            cost_price=Decimal("45.00"),
            sale_price=Decimal("80.00"),
            supplier_name="BioVet Distribuição"
        )
        db.add_all([inv1, inv2])

        db.commit()
        print("Demo data seeded successfully for Dra. Carolina Mendes.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        init_db(db)
    finally:
        db.close()
