from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
import smtplib

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, digest_reset_token, hash_password, new_reset_token, verify_password
from app.database.session import get_db
from app.models.entities import PasswordReset, User
from app.schemas.auth import AuthResponse, ForgotPassword, ProfileUpdate, ResetPassword, UserLogin, UserProfile, UserRegister

router = APIRouter(prefix="/auth", tags=["authentication"])


def _send_reset_email(email: str, full_name: str, token: str) -> None:
    if not all((settings.smtp_host, settings.smtp_from_email)):
        return
    message = EmailMessage()
    message["Subject"] = "Reset your FairIoT password"
    message["From"] = settings.smtp_from_email
    message["To"] = email
    link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    message.set_content(
        f"Hello {full_name},\n\nUse this one-time link to choose a new FairIoT password. "
        f"It expires in 30 minutes.\n\n{link}\n\nIf you did not request this, ignore this message."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password or "")
        server.send_message(message)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)) -> AuthResponse:
    email = str(payload.email).strip().lower()
    if db.scalar(select(User.id).where(User.email == email)) is not None:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = User(email=email, full_name=payload.full_name, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=UserProfile.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> AuthResponse:
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.", headers={"WWW-Authenticate": "Bearer"})
    return AuthResponse(access_token=create_access_token(user.id), user=UserProfile.model_validate(user))


@router.get("/me", response_model=UserProfile)
def me(user: User = Depends(get_current_user)) -> UserProfile:
    return UserProfile.model_validate(user)


@router.patch("/profile", response_model=UserProfile)
def update_profile(payload: ProfileUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> UserProfile:
    user.full_name = payload.full_name
    db.commit()
    db.refresh(user)
    return UserProfile.model_validate(user)


@router.post("/forgot-password")
def forgot_password(payload: ForgotPassword, db: Session = Depends(get_db)) -> dict[str, str]:
    email = str(payload.email).strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is not None and settings.smtp_host and settings.smtp_from_email:
        token = new_reset_token()
        db.add(PasswordReset(
            user_id=user.id,
            token_hash=digest_reset_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        ))
        db.commit()
        try:
            _send_reset_email(user.email, user.full_name, token)
        except (OSError, smtplib.SMTPException):
            # Do not disclose whether the account exists or whether the mail transport failed.
            db.rollback()
    return {"message": "If this address is registered and password-reset email is configured, instructions will be sent."}


@router.post("/reset-password")
def reset_password(payload: ResetPassword, db: Session = Depends(get_db)) -> dict[str, str]:
    reset = db.scalar(select(PasswordReset).where(PasswordReset.token_hash == digest_reset_token(payload.token)))
    now = datetime.now(timezone.utc)
    expires = reset.expires_at if reset else None
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if reset is None or reset.used_at is not None or expires is None or expires <= now:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")
    reset.owner.password_hash = hash_password(payload.password)
    reset.used_at = now
    db.commit()
    return {"message": "Password updated. You can now sign in."}
