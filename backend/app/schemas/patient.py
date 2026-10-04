from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, field_validator
from app.models.patient import Species, PatientGender

class PatientBase(BaseModel):
    tutor_id: int
    name: str
    species: Species = Species.CANINA
    custom_species: Optional[str] = None
    breed: Optional[str] = "SRD"
    gender: PatientGender = PatientGender.INDEFINIDO
    birth_date: Optional[date] = None
    approximate_age: Optional[str] = None
    weight_kg: Optional[float] = None
    coat_color: Optional[str] = None
    is_neutered: bool = False
    microchip: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

    model_config = {"extra": "ignore"}

    @field_validator("microchip", "approximate_age", "coat_color", "notes", "custom_species", "breed", "photo_url", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("birth_date", mode="before")
    @classmethod
    def empty_date_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("weight_kg", mode="before")
    @classmethod
    def clean_weight(cls, v):
        if v == "" or v is None:
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    tutor_id: Optional[int] = None
    name: Optional[str] = None
    species: Optional[Species] = None
    custom_species: Optional[str] = None
    breed: Optional[str] = None
    gender: Optional[PatientGender] = None
    birth_date: Optional[date] = None
    approximate_age: Optional[str] = None
    weight_kg: Optional[float] = None
    coat_color: Optional[str] = None
    is_neutered: Optional[bool] = None
    microchip: Optional[str] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = {"extra": "ignore"}

    @field_validator("microchip", "approximate_age", "coat_color", "notes", "custom_species", "breed", "photo_url", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("birth_date", mode="before")
    @classmethod
    def empty_date_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

    @field_validator("weight_kg", mode="before")
    @classmethod
    def clean_weight(cls, v):
        if v == "" or v is None:
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None

class PatientResponse(PatientBase):
    id: int
    owner_id: int
    tutor_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
