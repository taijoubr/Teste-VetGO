from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate, PasswordChange
from app.schemas.dashboard import PlanUsageStats
from app.auth.dependencies import get_current_user
from app.services.plan_service import get_user_plan_usage

router = APIRouter()

@router.get("/me", response_model=UserResponse)
def get_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_in: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/password")
def update_password(
    pwd_data: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(pwd_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta."
        )
    if len(pwd_data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve possuir no mínimo 6 caracteres."
        )
    
    current_user.hashed_password = get_password_hash(pwd_data.new_password)
    db.commit()
    return {"message": "Senha atualizada com sucesso."}

@router.get("/plan-usage", response_model=PlanUsageStats)
def get_plan_usage(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return get_user_plan_usage(db, current_user)
