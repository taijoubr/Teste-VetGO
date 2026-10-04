from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.core.database import get_db
from app.models.user import User
from app.models.tutor import Tutor
from app.models.patient import Patient
from app.schemas.tutor import TutorCreate, TutorUpdate, TutorResponse
from app.auth.dependencies import get_current_user
from app.services.plan_service import check_can_add_tutor

router = APIRouter()

@router.get("", response_model=List[TutorResponse])
def list_tutors(
    search: Optional[str] = None,
    status_filter: Optional[str] = None,  # "active", "inactive", "all"
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Tutor).filter(Tutor.owner_id == current_user.id)
    
    if status_filter == "active":
        query = query.filter(Tutor.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(Tutor.is_active == False)
        
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Tutor.name.ilike(s),
                Tutor.cpf.ilike(s),
                Tutor.phone.ilike(s),
                Tutor.whatsapp.ilike(s),
                Tutor.email.ilike(s),
                Tutor.city.ilike(s)
            )
        )
    
    tutors = query.order_by(Tutor.created_at.desc()).offset(skip).limit(limit).all()
    
    # Attach patient count
    results = []
    for tutor in tutors:
        p_count = db.query(func.count(Patient.id)).filter(
            Patient.owner_id == current_user.id,
            Patient.tutor_id == tutor.id
        ).scalar() or 0
        
        t_dict = {
            "id": tutor.id,
            "owner_id": tutor.owner_id,
            "name": tutor.name,
            "cpf": tutor.cpf,
            "phone": tutor.phone,
            "whatsapp": tutor.whatsapp,
            "email": tutor.email,
            "address": tutor.address,
            "address_number": tutor.address_number,
            "complement": tutor.complement,
            "neighborhood": tutor.neighborhood,
            "city": tutor.city,
            "state": tutor.state,
            "postal_code": tutor.postal_code,
            "notes": tutor.notes,
            "is_active": tutor.is_active,
            "created_at": tutor.created_at,
            "updated_at": tutor.updated_at,
            "patients_count": p_count
        }
        results.append(t_dict)
        
    return results

@router.post("", response_model=TutorResponse, status_code=status.HTTP_201_CREATED)
def create_tutor(
    tutor_in: TutorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Rule 41/42/43: Check plan limits
    check_can_add_tutor(db, current_user)
    
    tutor = Tutor(
        owner_id=current_user.id,
        name=tutor_in.name.strip(),
        cpf=tutor_in.cpf,
        phone=tutor_in.phone,
        whatsapp=tutor_in.whatsapp,
        email=tutor_in.email,
        address=tutor_in.address,
        address_number=tutor_in.address_number,
        complement=tutor_in.complement,
        neighborhood=tutor_in.neighborhood,
        city=tutor_in.city,
        state=tutor_in.state,
        postal_code=tutor_in.postal_code,
        notes=tutor_in.notes,
        is_active=tutor_in.is_active
    )
    db.add(tutor)
    db.commit()
    db.refresh(tutor)
    
    return {
        "id": tutor.id,
        "owner_id": tutor.owner_id,
        "name": tutor.name,
        "cpf": tutor.cpf,
        "phone": tutor.phone,
        "whatsapp": tutor.whatsapp,
        "email": tutor.email,
        "address": tutor.address,
        "address_number": tutor.address_number,
        "complement": tutor.complement,
        "neighborhood": tutor.neighborhood,
        "city": tutor.city,
        "state": tutor.state,
        "postal_code": tutor.postal_code,
        "notes": tutor.notes,
        "is_active": tutor.is_active,
        "created_at": tutor.created_at,
        "updated_at": tutor.updated_at,
        "patients_count": 0
    }

@router.get("/{tutor_id}", response_model=TutorResponse)
def get_tutor(
    tutor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tutor = db.query(Tutor).filter(
        Tutor.id == tutor_id,
        Tutor.owner_id == current_user.id
    ).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor não encontrado.")
        
    p_count = db.query(func.count(Patient.id)).filter(
        Patient.owner_id == current_user.id,
        Patient.tutor_id == tutor.id
    ).scalar() or 0
    
    return {
        "id": tutor.id,
        "owner_id": tutor.owner_id,
        "name": tutor.name,
        "cpf": tutor.cpf,
        "phone": tutor.phone,
        "whatsapp": tutor.whatsapp,
        "email": tutor.email,
        "address": tutor.address,
        "address_number": tutor.address_number,
        "complement": tutor.complement,
        "neighborhood": tutor.neighborhood,
        "city": tutor.city,
        "state": tutor.state,
        "postal_code": tutor.postal_code,
        "notes": tutor.notes,
        "is_active": tutor.is_active,
        "created_at": tutor.created_at,
        "updated_at": tutor.updated_at,
        "patients_count": p_count
    }

@router.put("/{tutor_id}", response_model=TutorResponse)
def update_tutor(
    tutor_id: int,
    tutor_in: TutorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tutor = db.query(Tutor).filter(
        Tutor.id == tutor_id,
        Tutor.owner_id == current_user.id
    ).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor não encontrado.")
        
    update_data = tutor_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tutor, field, value)
        
    db.commit()
    db.refresh(tutor)
    
    p_count = db.query(func.count(Patient.id)).filter(
        Patient.owner_id == current_user.id,
        Patient.tutor_id == tutor.id
    ).scalar() or 0
    
    return {
        "id": tutor.id,
        "owner_id": tutor.owner_id,
        "name": tutor.name,
        "cpf": tutor.cpf,
        "phone": tutor.phone,
        "whatsapp": tutor.whatsapp,
        "email": tutor.email,
        "address": tutor.address,
        "address_number": tutor.address_number,
        "complement": tutor.complement,
        "neighborhood": tutor.neighborhood,
        "city": tutor.city,
        "state": tutor.state,
        "postal_code": tutor.postal_code,
        "notes": tutor.notes,
        "is_active": tutor.is_active,
        "created_at": tutor.created_at,
        "updated_at": tutor.updated_at,
        "patients_count": p_count
    }

@router.patch("/{tutor_id}/toggle-status")
def toggle_tutor_status(
    tutor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tutor = db.query(Tutor).filter(
        Tutor.id == tutor_id,
        Tutor.owner_id == current_user.id
    ).first()
    if not tutor:
        raise HTTPException(status_code=404, detail="Tutor não encontrado.")
        
    tutor.is_active = not tutor.is_active
    db.commit()
    return {"message": f"Tutor {'ativado' if tutor.is_active else 'inativado'} com sucesso.", "is_active": tutor.is_active}
