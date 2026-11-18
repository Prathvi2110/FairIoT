from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

from app.core.config import settings

_password_hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, encoded: str) -> bool:
    try:
        return _password_hasher.verify(encoded, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=settings.access_token_minutes)},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> int:
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    return int(payload["sub"])


def new_reset_token() -> str:
    return secrets.token_urlsafe(36)


def digest_reset_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()
