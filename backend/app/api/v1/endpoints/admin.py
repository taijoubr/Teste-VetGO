from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.core.database import get_db
from app.models.user import User, UserRole, SubscriptionPlan, SubscriptionStatus
from app.models.tutor import Tutor
from app.models.patient import Patient
from app.models.audit import AuditLog
from app.schemas.admin import (
    AdminUserItem, AdminSubscriptionUpdate, AdminAuditLogItem, AdminStatsResponse
)
from app.auth.dependencies import get_current_admin
from app.services.audit_service import record_audit_log

router = APIRouter()

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_vets = db.query(func.count(User.id)).filter(User.role == UserRole.VET).scalar() or 0
    total_free = db.query(func.count(User.id)).filter(User.plan == SubscriptionPlan.FREE).scalar() or 0
    total_pro = db.query(func.count(User.id)).filter(User.plan == SubscriptionPlan.PRO).scalar() or 0
    total_lifetime = db.query(func.count(User.id)).filter(User.is_lifetime == True).scalar() or 0
    total_active = db.query(func.count(User.id)).filter(User.subscription_status == SubscriptionStatus.ACTIVE).scalar() or 0

    return {
        "total_users": total_users,
        "total_vets": total_vets,
        "total_free_users": total_free,
        "total_pro_users": total_pro,
        "total_lifetime_users": total_lifetime,
        "total_active_subscriptions": total_active
    }

@router.get("/users", response_model=List[AdminUserItem])
def list_admin_users(
    search: Optional[str] = None,
    plan_filter: Optional[SubscriptionPlan] = None,
    status_filter: Optional[SubscriptionStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = db.query(User)
    
    if plan_filter:
        query = query.filter(User.plan == plan_filter)
    if status_filter:
        query = query.filter(User.subscription_status == status_filter)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.first_name.ilike(s),
                User.last_name.ilike(s),
                User.email.ilike(s),
                User.crmv.ilike(s)
            )
        )
        
    users = query.order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    results = []
    for u in users:
        t_count = db.query(func.count(Tutor.id)).filter(Tutor.owner_id == u.id).scalar() or 0
        p_count = db.query(func.count(Patient.id)).filter(Patient.owner_id == u.id).scalar() or 0
        results.append({
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "crmv": u.crmv,
            "crmv_uf": u.crmv_uf,
            "phone": u.phone,
            "role": u.role,
            "plan": u.plan,
            "subscription_status": u.subscription_status,
            "is_lifetime": u.is_lifetime,
            "subscription_start": u.subscription_start,
            "subscription_end": u.subscription_end,
            "is_active": u.is_active,
            "created_at": u.created_at,
            "tutors_count": t_count,
            "patients_count": p_count
        })
    return results

@router.put("/users/{user_id}/subscription", response_model=AdminUserItem)
def update_user_subscription(
    user_id: int,
    sub_in: AdminSubscriptionUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
        
    changes = []
    if sub_in.plan is not None and sub_in.plan != user.plan:
        changes.append(f"Plano alterado de {user.plan.value} para {sub_in.plan.value}")
        user.plan = sub_in.plan
        
    if sub_in.subscription_status is not None and sub_in.subscription_status != user.subscription_status:
        changes.append(f"Status da assinatura alterado de {user.subscription_status.value} para {sub_in.subscription_status.value}")
        user.subscription_status = sub_in.subscription_status

    if sub_in.is_lifetime is not None and sub_in.is_lifetime != user.is_lifetime:
        changes.append(f"Vitalícia alterada para: {'SIM' if sub_in.is_lifetime else 'NÃO'}")
        user.is_lifetime = sub_in.is_lifetime

    if sub_in.subscription_end is not None:
        changes.append(f"Vencimento alterado para {sub_in.subscription_end}")
        user.subscription_end = sub_in.subscription_end

    if sub_in.admin_notes is not None:
        user.admin_notes = sub_in.admin_notes

    if sub_in.origin:
        user.subscription_origin = sub_in.origin

    db.commit()
    db.refresh(user)

    # Record audit log
    record_audit_log(
        db=db,
        admin=admin,
        action="UPDATE_SUBSCRIPTION",
        target_user=user,
        details="; ".join(changes) if changes else "Atualização de anotações da assinatura"
    )

    t_count = db.query(func.count(Tutor.id)).filter(Tutor.owner_id == user.id).scalar() or 0
    p_count = db.query(func.count(Patient.id)).filter(Patient.owner_id == user.id).scalar() or 0

    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "crmv": user.crmv,
        "crmv_uf": user.crmv_uf,
        "phone": user.phone,
        "role": user.role,
        "plan": user.plan,
        "subscription_status": user.subscription_status,
        "is_lifetime": user.is_lifetime,
        "subscription_start": user.subscription_start,
        "subscription_end": user.subscription_end,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "tutors_count": t_count,
        "patients_count": p_count
    }

@router.patch("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Você não pode desativar seu próprio usuário de administrador.")

    user.is_active = not user.is_active
    db.commit()

    record_audit_log(
        db=db,
        admin=admin,
        action="BLOCK_USER" if not user.is_active else "UNBLOCK_USER",
        target_user=user,
        details=f"Conta {'bloqueada' if not user.is_active else 'desbloqueada'}"
    )

    return {"message": f"Usuário {'desbloqueado' if user.is_active else 'bloqueado'} com sucesso.", "is_active": user.is_active}

@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    if user_id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode excluir sua própria conta de administrador."
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado."
        )

    if user.email in ("ncodestechnologies@gmail.com", "admin@vetgo.com.br"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta conta principal de administrador não pode ser excluída."
        )

    user_email = user.email
    user_name = f"{user.first_name} {user.last_name}".strip()

    # Desvincular registros de auditoria existentes para não violar integridade referencial
    db.query(AuditLog).filter(AuditLog.target_user_id == user_id).update({"target_user_id": None}, synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.admin_id == user_id).update({"admin_id": None}, synchronize_session=False)

    db.delete(user)
    db.commit()

    # Gravar auditoria sem referenciar o objeto excluído
    log = AuditLog(
        admin_id=admin.id,
        admin_name=admin.full_name,
        target_user_id=None,
        target_user_name=user_name,
        action="DELETE_USER",
        details=f"Conta de usuário excluída permanentemente pelo administrador: {user_email}"
    )
    db.add(log)
    db.commit()

    return {"message": f"Usuário {user_email} excluído com sucesso."}

@router.get("/audit-logs", response_model=List[AdminAuditLogItem])
def list_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    return logs
