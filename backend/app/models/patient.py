import enum
from datetime import datetime, date, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date, Float, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class Species(str, enum.Enum):
    CANINA = "Canina"
    FELINA = "Felina"
    EQUINA = "Equina"
    BOVINA = "Bovina"
    OVINA = "Ovina"
    CAPRINA = "Caprina"
    SUINA = "Suína"
    LAGOMORFA = "Lagomorfa"
    ROEDORES = "Roedores"
    AVES = "Aves"
    REPTEIS = "Répteis"
    ANFIBIOS = "Anfíbios"
    MUSTELIDEOS = "Mustelídeos"
    SILVESTRES = "Silvestres/Exóticos"
    OUTRA = "Outra"

class PatientGender(str, enum.Enum):
    MACHO = "Macho"
    FEMEA = "Fêmea"
    INDEFINIDO = "Indefinido"

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tutor_id = Column(Integer, ForeignKey("tutors.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    name = Column(String(100), nullable=False, index=True)
    species = Column(SQLEnum(Species), default=Species.CANINA, nullable=False)
    custom_species = Column(String(100), nullable=True)
    breed = Column(String(100), default="SRD", nullable=True)
    gender = Column(SQLEnum(PatientGender), default=PatientGender.INDEFINIDO, nullable=False)
    birth_date = Column(Date, nullable=True)
    approximate_age = Column(String(50), nullable=True)
    weight_kg = Column(Float, nullable=True)
    coat_color = Column(String(100), nullable=True)
    is_neutered = Column(Boolean, default=False, nullable=False)
    microchip = Column(String(50), nullable=True)
    photo_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="patients")
    tutor = relationship("Tutor", back_populates="patients")
    appointments = relationship("Appointment", back_populates="patient")
