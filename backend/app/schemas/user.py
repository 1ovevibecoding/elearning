"""
User schemas — Request/Response DTOs cho user endpoints
"""
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr


class UserBase(BaseModel):
    email: str
    name: str
    avatar_url: str | None = None


class UserCreate(UserBase):
    provider: str = "google"


class UserResponse(UserBase):
    id: str
    provider: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
