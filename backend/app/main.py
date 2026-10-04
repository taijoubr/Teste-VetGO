from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.api.v1.api import api_router
from app.database.seed import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed database
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        init_db(db)
    except Exception as e:
        print(f"Error during DB initialization: {e}")
    finally:
        db.close()
    yield
    # Shutdown: clean up if needed

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="SaaS de gestão para médicos-veterinários autônomos e atendimentos volantes.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers for friendly messages
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join([str(loc) for loc in err.get("loc", []) if loc != "body"])
        msg = err.get("msg", "Valor inválido")
        errors.append(f"{field}: {msg}" if field else msg)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Por favor, verifique os campos preenchidos.",
            "errors": errors
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Não foi possível processar a solicitação no momento. Tente novamente ou contate o suporte."
        }
    )

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "slogan": settings.PROJECT_SLOGAN,
        "api_version": "v1"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
