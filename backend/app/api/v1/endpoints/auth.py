from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User, UserRole, SubscriptionPlan, SubscriptionStatus
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse
from app.auth.dependencies import get_current_user

router = APIRouter()

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe uma conta cadastrada com este e-mail."
        )
    
    hashed_password = get_password_hash(user_in.password)
    new_user = User(
        email=user_in.email.lower().strip(),
        hashed_password=hashed_password,
        first_name=user_in.first_name.strip(),
        last_name=user_in.last_name.strip(),
        phone=user_in.phone,
        whatsapp=user_in.whatsapp,
        crmv=user_in.crmv,
        crmv_uf=user_in.crmv_uf,
        clinic_name=user_in.clinic_name,
        role=UserRole.VET,
        plan=SubscriptionPlan.FREE,
        subscription_status=SubscriptionStatus.ACTIVE
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(subject=new_user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.lower().strip()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos."
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sua conta está desativada. Entre em contato com o suporte Vetgo."
        )
    
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
