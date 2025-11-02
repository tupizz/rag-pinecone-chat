from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    """User model."""
    user_id: str
    email: EmailStr
    hashed_password: str
    full_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = True


class UserCreate(BaseModel):
    """User creation model."""
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    """User login model."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response model."""
    access_token: str
    token_type: str = "bearer"
    user_id: str
