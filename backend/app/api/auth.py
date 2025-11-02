from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime
import uuid

from app.db.mongodb import get_database
from app.models.user import UserCreate, UserLogin, TokenResponse
from app.core.security import create_access_token, verify_password, get_password_hash

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(
    user_data: UserCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Register a new user.
    """
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "hashed_password": get_password_hash(user_data.password),
        "full_name": user_data.full_name,
        "created_at": datetime.utcnow(),
        "is_active": True
    }

    await db.users.insert_one(user_doc)

    # Create access token
    access_token = create_access_token(data={"sub": user_id, "email": user_data.email})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user_id
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    credentials: UserLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Login with email and password.
    """
    # Find user
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Verify password
    if not verify_password(credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": user["user_id"], "email": user["email"]}
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user["user_id"]
    )


@router.post("/promote-anonymous")
async def promote_anonymous_session(
    session_id: str,
    user_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Promote an anonymous session to an authenticated user.
    Called after registration/login to transfer chat history.
    """
    # Find anonymous session
    session = await db.sessions.find_one({
        "session_id": session_id,
        "user_id": None
    })

    if not session:
        return {"message": "No anonymous session found"}

    # Update session with user_id
    await db.sessions.update_one(
        {"session_id": session_id},
        {"$set": {"user_id": user_id}}
    )

    return {"message": "Session promoted successfully"}
