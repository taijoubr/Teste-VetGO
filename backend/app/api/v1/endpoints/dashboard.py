from datetime import datetime, date, time, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.user import User
from app.models.tutor import Tutor
from app.models.patient import Patient
from app.models.appointment import Appointment, AppointmentStatus
from app.models.financial import FinancialEntry, FinancialType, FinancialStatus
from app.models.inventory import InventoryItem
from app.schemas.dashboard import DashboardStatsResponse, FinancialSummary
from app.auth.dependencies import get_current_user
from app.services.plan_service import get_user_plan_usage

router = APIRouter()

@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    now = datetime.now(timezone.utc)
    today = date.today()
    start_of_today = datetime.combine(today, time.min)
    end_of_today = datetime.combine(today, time.max)
    
    # Plan usage
    plan_usage = get_user_plan_usage(db, current_user)
    
    # Counts
    total_tutors = db.query(func.count(Tutor.id)).filter(Tutor.owner_id == current_user.id).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).filter(Patient.owner_id == current_user.id).scalar() or 0
    
    # Today's appointments
    today_appts_q = db.query(Appointment).filter(
        Appointment.owner_id == current_user.id,
        Appointment.date_time >= start_of_today,
        Appointment.date_time <= end_of_today,
        Appointment.status != AppointmentStatus.CANCELADO
    ).order_by(Appointment.date_time.asc()).all()
    
    today_appointments = []
    for appt in today_appts_q:
        tutor = db.query(Tutor).filter(Tutor.id == appt.tutor_id).first()
        patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        spec = None
        if patient and patient.species:
            spec = getattr(patient.species, "value", str(patient.species))
        today_appointments.append({
            "id": appt.id,
            "owner_id": appt.owner_id,
            "tutor_id": appt.tutor_id,
            "tutor_name": tutor.name if tutor else "Tutor",
            "patient_id": appt.patient_id,
            "patient_name": patient.name if patient else "Paciente",
            "patient_species": spec,
            "date_time": appt.date_time,
            "duration_minutes": appt.duration_minutes,
            "address": appt.address,
            "appointment_type": appt.appointment_type,
            "status": appt.status,
            "reason": appt.reason,
            "notes": appt.notes,
            "created_at": appt.created_at,
            "updated_at": appt.updated_at
        })
        
    # Upcoming appointments (next 7 days after today)
    upcoming_count = db.query(func.count(Appointment.id)).filter(
        Appointment.owner_id == current_user.id,
        Appointment.date_time > end_of_today,
        Appointment.date_time <= (end_of_today + timedelta(days=7)),
        Appointment.status != AppointmentStatus.CANCELADO
    ).scalar() or 0
    
    # Recent patients
    recent_patients_q = db.query(Patient).filter(
        Patient.owner_id == current_user.id
    ).order_by(Patient.created_at.desc()).limit(5).all()
    
    recent_patients = []
    for p in recent_patients_q:
        tutor = db.query(Tutor).filter(Tutor.id == p.tutor_id).first()
        recent_patients.append({
            "id": p.id,
            "owner_id": p.owner_id,
            "tutor_id": p.tutor_id,
            "tutor_name": tutor.name if tutor else "Tutor",
            "name": p.name,
            "species": p.species,
            "custom_species": p.custom_species,
            "breed": p.breed,
            "gender": p.gender,
            "birth_date": p.birth_date,
            "approximate_age": p.approximate_age,
            "weight_kg": p.weight_kg,
            "coat_color": p.coat_color,
            "is_neutered": p.is_neutered,
            "microchip": p.microchip,
            "photo_url": p.photo_url,
            "notes": p.notes,
            "is_active": p.is_active,
            "created_at": p.created_at,
            "updated_at": p.updated_at
        })

    # Recent tutors
    recent_tutors_q = db.query(Tutor).filter(
        Tutor.owner_id == current_user.id
    ).order_by(Tutor.created_at.desc()).limit(5).all()
    
    recent_tutors = []
    for t in recent_tutors_q:
        p_count = db.query(func.count(Patient.id)).filter(
            Patient.owner_id == current_user.id,
            Patient.tutor_id == t.id
        ).scalar() or 0
        recent_tutors.append({
            "id": t.id,
            "owner_id": t.owner_id,
            "name": t.name,
            "cpf": t.cpf,
            "phone": t.phone,
            "whatsapp": t.whatsapp,
            "email": t.email,
            "address": t.address,
            "address_number": t.address_number,
            "complement": t.complement,
            "neighborhood": t.neighborhood,
            "city": t.city,
            "state": t.state,
            "postal_code": t.postal_code,
            "notes": t.notes,
            "is_active": t.is_active,
            "created_at": t.created_at,
            "updated_at": t.updated_at,
            "patients_count": p_count
        })

    # Financial summary for the current month
    first_day_of_month = date(today.year, today.month, 1)
    
    total_receitas = db.query(func.sum(FinancialEntry.amount)).filter(
        FinancialEntry.owner_id == current_user.id,
        FinancialEntry.entry_type == FinancialType.RECEITA,
        FinancialEntry.status == FinancialStatus.PAGO,
        FinancialEntry.due_date >= first_day_of_month
    ).scalar() or 0.0
    
    total_despesas = db.query(func.sum(FinancialEntry.amount)).filter(
        FinancialEntry.owner_id == current_user.id,
        FinancialEntry.entry_type == FinancialType.DESPESA,
        FinancialEntry.status == FinancialStatus.PAGO,
        FinancialEntry.due_date >= first_day_of_month
    ).scalar() or 0.0
    
    pendentes_q = db.query(
        func.count(FinancialEntry.id),
        func.sum(FinancialEntry.amount)
    ).filter(
        FinancialEntry.owner_id == current_user.id,
        FinancialEntry.status == FinancialStatus.PENDENTE
    ).first()
    
    contas_pendentes_count = pendentes_q[0] or 0
    contas_pendentes_valor = pendentes_q[1] or 0.0

    # Low stock count
    low_stock_count = db.query(func.count(InventoryItem.id)).filter(
        InventoryItem.owner_id == current_user.id,
        InventoryItem.is_active == True,
        InventoryItem.stock_quantity <= InventoryItem.min_stock
    ).scalar() or 0

    return {
        "plan_usage": plan_usage,
        "today_appointments_count": len(today_appointments),
        "upcoming_appointments_count": upcoming_count,
        "total_patients_count": total_patients,
        "total_tutors_count": total_tutors,
        "financial_summary": {
            "total_receitas_mes": float(total_receitas),
            "total_despesas_mes": float(total_despesas),
            "saldo_mes": float(total_receitas - total_despesas),
            "contas_pendentes_count": contas_pendentes_count,
            "contas_pendentes_valor": float(contas_pendentes_valor)
        },
        "today_appointments": today_appointments,
        "recent_patients": recent_patients,
        "recent_tutors": recent_tutors,
        "low_stock_count": low_stock_count
    }

@router.get("/plan-usage")
def get_plan_usage_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_plan_usage(db, current_user)

