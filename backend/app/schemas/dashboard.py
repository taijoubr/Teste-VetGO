from typing import List, Optional
from pydantic import BaseModel
from app.schemas.appointment import AppointmentResponse
from app.schemas.patient import PatientResponse
from app.schemas.tutor import TutorResponse

class PlanUsageStats(BaseModel):
    plan: str
    is_lifetime: bool
    is_expired: bool
    tutors_count: int
    tutors_limit: Optional[int] = None
    tutors_limit_reached: bool
    patients_count: int
    patients_limit: Optional[int] = None
    patients_limit_reached: bool

class FinancialSummary(BaseModel):
    total_receitas_mes: float
    total_despesas_mes: float
    saldo_mes: float
    contas_pendentes_count: int
    contas_pendentes_valor: float

class DashboardStatsResponse(BaseModel):
    plan_usage: PlanUsageStats
    today_appointments_count: int
    upcoming_appointments_count: int
    total_patients_count: int
    total_tutors_count: int
    financial_summary: FinancialSummary
    today_appointments: List[AppointmentResponse]
    recent_patients: List[PatientResponse]
    recent_tutors: List[TutorResponse]
    low_stock_count: int
