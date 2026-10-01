from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, field_validator

class TutorBase(BaseModel):
    name: str
    cpf: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

    model_config = {"extra": "ignore"}

    @field_validator("email", "cpf", "phone", "whatsapp", "address", "address_number", "complement", "neighborhood", "city", "state", "postal_code", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

class TutorCreate(TutorBase):
    pass

class TutorUpdate(BaseModel):
    name: Optional[str] = None
    cpf: Optional[str] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    address_number: Optional[str] = None
    complement: Optional[str] = None
    neighborhood: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    model_config = {"extra": "ignore"}

    @field_validator("email", "cpf", "phone", "whatsapp", "address", "address_number", "complement", "neighborhood", "city", "state", "postal_code", "notes", mode="before")
    @classmethod
    def empty_str_to_none(cls, v):
        if v == "" or v is None:
            return None
        return v

class TutorResponse(TutorBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    patients_count: Optional[int] = 0

    class Config:
        from_attributes = True
