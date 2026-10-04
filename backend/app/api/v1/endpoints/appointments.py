from typing import List, Optional
from datetime import datetime, date, time
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.models.tutor import Tutor
from app.models.patient import Patient
from app.models.appointment import Appointment, AppointmentStatus, AppointmentType
from app.schemas.appointment import AppointmentCreate, AppointmentUpdate, AppointmentResponse
from app.auth.dependencies import get_current_user

router = APIRouter()

@router.get("", response_model=List[AppointmentResponse])
def list_appointments(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status_filter: Optional[AppointmentStatus] = None,
    tutor_id: Optional[int] = None,
    patient_id: Optional[int] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Appointment).filter(Appointment.owner_id == current_user.id)
    
    if start_date:
        query = query.filter(Appointment.date_time >= datetime.combine(start_date, time.min))
    if end_date:
        query = query.filter(Appointment.date_time <= datetime.combine(end_date, time.max))
    if status_filter:
        query = query.filter(Appointment.status == status_filter)
    if tutor_id:
        query = query.filter(Appointment.tutor_id == tutor_id)
    if patient_id:
        query = query.filter(Appointment.patient_id == patient_id)
        
    appointments = query.order_by(Appointment.date_time.asc()).offset(skip).limit(limit).all()
    
    results = []
    for appt in appointments:
        tutor = db.query(Tutor).filter(Tutor.id == appt.tutor_id).first()
        patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
        results.append({
            "id": appt.id,
            "owner_id": appt.owner_id,
            "tutor_id": appt.tutor_id,
            "tutor_name": tutor.name if tutor else "Tutor",
            "patient_id": appt.patient_id,
            "patient_name": patient.name if patient else "Paciente",
            "patient_species": patient.species.value if patient else None,
            "date_time": appt.date_time,
            "duration_minutes": appt.duration_minutes,
            "address": appt.address or (tutor.address if tutor else None),
            "appointment_type": appt.appointment_type,
            "status": appt.status,
            "reason": appt.reason,
            "notes": appt.notes,
            "created_at": appt.created_at,
            "updated_at": appt.updated_at
        })
    return results

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
def create_appointment(
    appt_in: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tutor = db.query(Tutor).filter(
        Tutor.id == appt_in.tutor_id,
        Tutor.owner_id == current_user.id
    ).first()
    if not tutor:
        raise HTTPException(status_code=400, detail="Tutor inválido ou não pertencente a você.")
        
    patient = db.query(Patient).filter(
        Patient.id == appt_in.patient_id,
        Patient.owner_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=400, detail="Paciente inválido ou não pertencente a você.")
        
    appt = Appointment(
        owner_id=current_user.id,
        tutor_id=appt_in.tutor_id,
        patient_id=appt_in.patient_id,
        date_time=appt_in.date_time,
        duration_minutes=appt_in.duration_minutes,
        address=appt_in.address or tutor.address,
        appointment_type=appt_in.appointment_type,
        status=appt_in.status,
        reason=appt_in.reason,
        notes=appt_in.notes
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    
    return {
        "id": appt.id,
        "owner_id": appt.owner_id,
        "tutor_id": appt.tutor_id,
        "tutor_name": tutor.name,
        "patient_id": appt.patient_id,
        "patient_name": patient.name,
        "patient_species": patient.species.value,
        "date_time": appt.date_time,
        "duration_minutes": appt.duration_minutes,
        "address": appt.address,
        "appointment_type": appt.appointment_type,
        "status": appt.status,
        "reason": appt.reason,
        "notes": appt.notes,
        "created_at": appt.created_at,
        "updated_at": appt.updated_at
    }

@router.put("/{appointment_id}", response_model=AppointmentResponse)
def update_appointment(
    appointment_id: int,
    appt_in: AppointmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.owner_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        
    update_data = appt_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(appt, field, value)
        
    db.commit()
    db.refresh(appt)
    
    tutor = db.query(Tutor).filter(Tutor.id == appt.tutor_id).first()
    patient = db.query(Patient).filter(Patient.id == appt.patient_id).first()
    return {
        "id": appt.id,
        "owner_id": appt.owner_id,
        "tutor_id": appt.tutor_id,
        "tutor_name": tutor.name if tutor else "Tutor",
        "patient_id": appt.patient_id,
        "patient_name": patient.name if patient else "Paciente",
        "patient_species": patient.species.value if patient else None,
        "date_time": appt.date_time,
        "duration_minutes": appt.duration_minutes,
        "address": appt.address,
        "appointment_type": appt.appointment_type,
        "status": appt.status,
        "reason": appt.reason,
        "notes": appt.notes,
        "created_at": appt.created_at,
        "updated_at": appt.updated_at
    }

@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    appt = db.query(Appointment).filter(
        Appointment.id == appointment_id,
        Appointment.owner_id == current_user.id
    ).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    
    db.delete(appt)
    db.commit()
    return {"message": "Agendamento excluído com sucesso."}

