from typing import Optional
from datetime import datetime
from pydantic import BaseModel, field_validator
from app.models.appointment import AppointmentStatus, AppointmentType

class AppointmentBase(BaseModel):
    tutor_id: int
    patient_id: int
    date_time: datetime
    duration_minutes: int = 60
    address: Optional[str] = None
    appointment_type: AppointmentType = AppointmentType.DOMICILIAR
    status: AppointmentStatus = AppointmentStatus.AGENDADO
    reason: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"extra": "ignore"}

    @field_validator("address", "reason", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    tutor_id: Optional[int] = None
    patient_id: Optional[int] = None
    date_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    address: Optional[str] = None
    appointment_type: Optional[AppointmentType] = None
    status: Optional[AppointmentStatus] = None
    reason: Optional[str] = None
    notes: Optional[str] = None

    model_config = {"extra": "ignore"}

    @field_validator("address", "reason", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

class AppointmentResponse(AppointmentBase):
    id: int
    owner_id: int
    tutor_name: Optional[str] = None
    patient_name: Optional[str] = None
    patient_species: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
