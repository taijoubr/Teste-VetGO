import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

class AppointmentStatus(str, enum.Enum):
    AGENDADO = "AGENDADO"
    CONFIRMADO = "CONFIRMADO"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    CONCLUIDO = "CONCLUIDO"
    CANCELADO = "CANCELADO"

class AppointmentType(str, enum.Enum):
    DOMICILIAR = "Domiciliar / Volante"
    CONSULTORIO = "Consultório / Clínica Parceira"
    EMERGENCIA = "Emergência"
    RETORNO = "Retorno"
    VACINACAO = "Vacinação"
    PROCEDIMENTO = "Procedimento"
    ANESTESIA = "Anestesia"
    OUTRO = "Outro"

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    tutor_id = Column(Integer, ForeignKey("tutors.id", ondelete="RESTRICT"), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="RESTRICT"), nullable=False, index=True)
    
    date_time = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, default=60, nullable=False)
    address = Column(String(255), nullable=True)  # Specific address for volante/domiciliary visits
    appointment_type = Column(SQLEnum(AppointmentType), default=AppointmentType.DOMICILIAR, nullable=False)
    status = Column(SQLEnum(AppointmentStatus), default=AppointmentStatus.AGENDADO, nullable=False)
    
    # Clinical outline & notes
    reason = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="appointments")
    tutor = relationship("Tutor")
    patient = relationship("Patient", back_populates="appointments")
