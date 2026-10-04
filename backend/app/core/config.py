from typing import List, Union
from decimal import Decimal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vetgo - Sistema de Gestão Veterinária"
    PROJECT_SLOGAN: str = "Veterinária onde você precisa"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = Field(
        default="vetgo_super_secret_jwt_key_development_only_2026_saas",
        description="JWT Secret Key. Must be overridden in production via environment variable."
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database - Supports SQLite in dev, PostgreSQL / Cloud SQL via DATABASE_URL
    DATABASE_URL: str = "sqlite:///./vetgo.db"
    
    # CORS - Strict origins; no wildcard with credentials in production
    BACKEND_CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v
    
    # SaaS Plan Limits
    FREE_PLAN_MAX_TUTORS: int = 30
    FREE_PLAN_MAX_PATIENTS: int = 50
    DEFAULT_MONTHLY_PRICE_BRL: Decimal = Decimal("18.00")

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=".env",
        extra="allow"
    )

settings = Settings()
