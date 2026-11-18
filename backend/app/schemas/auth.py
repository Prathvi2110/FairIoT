from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing_extensions import Annotated

from app.schemas.common import Name


class UserRegister(BaseModel):
    email: EmailStr
    full_name: Name
    password: Annotated[str, Field(min_length=10, max_length=128)]


class UserLogin(BaseModel):
    email: EmailStr
    password: Annotated[str, Field(min_length=1, max_length=128)]


class UserProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile


class ProfileUpdate(BaseModel):
    full_name: Name


class ForgotPassword(BaseModel):
    email: EmailStr


class ResetPassword(BaseModel):
    token: Annotated[str, Field(min_length=20, max_length=300)]
    password: Annotated[str, Field(min_length=10, max_length=128)]
