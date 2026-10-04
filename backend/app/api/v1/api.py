from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    users,
    tutors,
    patients,
    appointments,
    dashboard,
    admin,
    settings
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(users.router, prefix="/users", tags=["Usuários e Perfil"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(tutors.router, prefix="/tutors", tags=["Tutores"])
api_router.include_router(patients.router, prefix="/patients", tags=["Pacientes"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Agenda e Atendimentos"])
api_router.include_router(admin.router, prefix="/admin", tags=["Administração Vetgo"])
api_router.include_router(settings.router, prefix="/settings", tags=["Configurações"])
