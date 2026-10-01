from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.models.user import User
from app.models.tutor import Tutor
from app.models.patient import Patient, Species
from app.schemas.patient import PatientCreate, PatientUpdate, PatientResponse
from app.auth.dependencies import get_current_user
from app.services.plan_service import check_can_add_patient

router = APIRouter()

@router.get("", response_model=List[PatientResponse])
def list_patients(
    tutor_id: Optional[int] = None,
    species: Optional[Species] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Patient).filter(Patient.owner_id == current_user.id)
    
    if tutor_id:
        query = query.filter(Patient.tutor_id == tutor_id)
        
    if species:
        query = query.filter(Patient.species == species)
        
    if status_filter == "active":
        query = query.filter(Patient.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(Patient.is_active == False)
        
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Patient.name.ilike(s),
                Patient.breed.ilike(s),
                Patient.microchip.ilike(s)
            )
        )
        
    patients = query.order_by(Patient.created_at.desc()).offset(skip).limit(limit).all()
    
    results = []
    for p in patients:
        tutor = db.query(Tutor).filter(Tutor.id == p.tutor_id).first()
        results.append({
            "id": p.id,
            "owner_id": p.owner_id,
            "tutor_id": p.tutor_id,
            "tutor_name": tutor.name if tutor else "Tutor não identificado",
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
    return results

@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check tutor belongs to user
    tutor = db.query(Tutor).filter(
        Tutor.id == patient_in.tutor_id,
        Tutor.owner_id == current_user.id
    ).first()
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor não encontrado para este veterinário."
        )
        
    # Check plan limit
    check_can_add_patient(db, current_user)
    
    patient = Patient(
        owner_id=current_user.id,
        tutor_id=patient_in.tutor_id,
        name=patient_in.name.strip(),
        species=patient_in.species,
        custom_species=patient_in.custom_species,
        breed=patient_in.breed,
        gender=patient_in.gender,
        birth_date=patient_in.birth_date,
        approximate_age=patient_in.approximate_age,
        weight_kg=patient_in.weight_kg,
        coat_color=patient_in.coat_color,
        is_neutered=patient_in.is_neutered,
        microchip=patient_in.microchip,
        photo_url=patient_in.photo_url,
        notes=patient_in.notes,
        is_active=patient_in.is_active
    )
    db.add(patient)
    db.commit()
    db.refresh(patient)
    
    return {
        "id": patient.id,
        "owner_id": patient.owner_id,
        "tutor_id": patient.tutor_id,
        "tutor_name": tutor.name,
        "name": patient.name,
        "species": patient.species,
        "custom_species": patient.custom_species,
        "breed": patient.breed,
        "gender": patient.gender,
        "birth_date": patient.birth_date,
        "approximate_age": patient.approximate_age,
        "weight_kg": patient.weight_kg,
        "coat_color": patient.coat_color,
        "is_neutered": patient.is_neutered,
        "microchip": patient.microchip,
        "photo_url": patient.photo_url,
        "notes": patient.notes,
        "is_active": patient.is_active,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at
    }

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.owner_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado.")
        
    tutor = db.query(Tutor).filter(Tutor.id == patient.tutor_id).first()
    return {
        "id": patient.id,
        "owner_id": patient.owner_id,
        "tutor_id": patient.tutor_id,
        "tutor_name": tutor.name if tutor else "Tutor",
        "name": patient.name,
        "species": patient.species,
        "custom_species": patient.custom_species,
        "breed": patient.breed,
        "gender": patient.gender,
        "birth_date": patient.birth_date,
        "approximate_age": patient.approximate_age,
        "weight_kg": patient.weight_kg,
        "coat_color": patient.coat_color,
        "is_neutered": patient.is_neutered,
        "microchip": patient.microchip,
        "photo_url": patient.photo_url,
        "notes": patient.notes,
        "is_active": patient.is_active,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at
    }

@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: int,
    patient_in: PatientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.owner_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado.")
        
    if patient_in.tutor_id is not None:
        tutor = db.query(Tutor).filter(
            Tutor.id == patient_in.tutor_id,
            Tutor.owner_id == current_user.id
        ).first()
        if not tutor:
            raise HTTPException(status_code=400, detail="Novo tutor inválido ou não pertencente a você.")
            
    update_data = patient_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)
        
    db.commit()
    db.refresh(patient)
    
    tutor = db.query(Tutor).filter(Tutor.id == patient.tutor_id).first()
    return {
        "id": patient.id,
        "owner_id": patient.owner_id,
        "tutor_id": patient.tutor_id,
        "tutor_name": tutor.name if tutor else "Tutor",
        "name": patient.name,
        "species": patient.species,
        "custom_species": patient.custom_species,
        "breed": patient.breed,
        "gender": patient.gender,
        "birth_date": patient.birth_date,
        "approximate_age": patient.approximate_age,
        "weight_kg": patient.weight_kg,
        "coat_color": patient.coat_color,
        "is_neutered": patient.is_neutered,
        "microchip": patient.microchip,
        "photo_url": patient.photo_url,
        "notes": patient.notes,
        "is_active": patient.is_active,
        "created_at": patient.created_at,
        "updated_at": patient.updated_at
    }

@router.patch("/{patient_id}/toggle-status")
def toggle_patient_status(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id,
        Patient.owner_id == current_user.id
    ).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Paciente não encontrado.")
        
    patient.is_active = not patient.is_active
    db.commit()
    return {"message": f"Paciente {'ativado' if patient.is_active else 'inativado'} com sucesso.", "is_active": patient.is_active}
