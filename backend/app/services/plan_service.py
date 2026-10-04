from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User, SubscriptionPlan, SubscriptionStatus
from app.models.tutor import Tutor
from app.models.patient import Patient
from app.core.config import settings

def _is_valid_date(sub_end: datetime) -> bool:
    if not sub_end:
        return True
    if sub_end.tzinfo is not None:
        return sub_end >= datetime.now(timezone.utc)
    return sub_end >= datetime.utcnow()

def check_can_add_tutor(db: Session, user: User) -> None:
    # Lifetime accounts or PRO accounts with active subscription have no limits
    if user.is_lifetime:
        return
    
    if user.plan == SubscriptionPlan.PRO:
        if user.subscription_status == SubscriptionStatus.ACTIVE:
            if _is_valid_date(user.subscription_end):
                return

    # Free plan or expired pro
    # Rule 42: Total registrations count, INCLUDING inactive!
    total_tutors = db.query(func.count(Tutor.id)).filter(Tutor.owner_id == user.id).scalar() or 0
    if total_tutors >= settings.FREE_PLAN_MAX_TUTORS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Limite do plano gratuito atingido ({settings.FREE_PLAN_MAX_TUTORS} tutores cadastrados). "
                f"Você já possui {total_tutors} cadastros (ativos e inativos). "
                "Para cadastrar novos tutores sem restrições, assine o plano Vetgo Pro por apenas R$ 18,00/mês."
            )
        )

def check_can_add_patient(db: Session, user: User) -> None:
    # Lifetime accounts or PRO accounts with active subscription have no limits
    if user.is_lifetime:
        return
    
    if user.plan == SubscriptionPlan.PRO:
        if user.subscription_status == SubscriptionStatus.ACTIVE:
            if _is_valid_date(user.subscription_end):
                return

    # Free plan or expired pro
    # Rule 42: Total registrations count, INCLUDING inactive!
    total_patients = db.query(func.count(Patient.id)).filter(Patient.owner_id == user.id).scalar() or 0
    if total_patients >= settings.FREE_PLAN_MAX_PATIENTS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Limite do plano gratuito atingido ({settings.FREE_PLAN_MAX_PATIENTS} pacientes cadastrados). "
                f"Você já possui {total_patients} cadastros (ativos e inativos). "
                "Para cadastrar novos pacientes sem restrições, assine o plano Vetgo Pro por apenas R$ 18,00/mês."
            )
        )

def get_user_plan_usage(db: Session, user: User) -> dict:
    total_tutors = db.query(func.count(Tutor.id)).filter(Tutor.owner_id == user.id).scalar() or 0
    total_patients = db.query(func.count(Patient.id)).filter(Patient.owner_id == user.id).scalar() or 0

    is_pro = (user.plan == SubscriptionPlan.PRO and user.subscription_status == SubscriptionStatus.ACTIVE) or user.is_lifetime
    is_expired = bool(
        user.plan == SubscriptionPlan.PRO and 
        not user.is_lifetime and 
        user.subscription_end and 
        not _is_valid_date(user.subscription_end)
    )

    tutors_limit = None if is_pro else settings.FREE_PLAN_MAX_TUTORS
    patients_limit = None if is_pro else settings.FREE_PLAN_MAX_PATIENTS

    return {
        "plan": user.plan.value,
        "is_lifetime": user.is_lifetime,
        "is_expired": is_expired,
        "tutors_count": total_tutors,
        "tutors_limit": tutors_limit,
        "tutors_limit_reached": (total_tutors >= settings.FREE_PLAN_MAX_TUTORS) if not is_pro else False,
        "patients_count": total_patients,
        "patients_limit": patients_limit,
        "patients_limit_reached": (total_patients >= settings.FREE_PLAN_MAX_PATIENTS) if not is_pro else False
    }
