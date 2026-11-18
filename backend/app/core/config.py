from functools import lru_cache
from pathlib import Path
import secrets
import warnings

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


def _development_jwt_secret() -> str:
    warnings.warn(
        "JWT_SECRET_KEY is unset; using an ephemeral development-only key. "
        "Set JWT_SECRET_KEY to persist sessions and before any production deployment.",
        stacklevel=2,
    )
    return secrets.token_urlsafe(48)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "FairIoT API"
    database_url: str = f"sqlite:///{PROJECT_ROOT / 'fairiot.db'}"
    jwt_secret_key: str = Field(default_factory=_development_jwt_secret)
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    max_upload_mb: int = 15
    frontend_url: str = "http://localhost:3000"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
