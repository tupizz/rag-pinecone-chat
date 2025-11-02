from fastapi import Cookie, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.core.security import verify_token
from app.core.config import settings
import uuid

security = HTTPBearer(auto_error=False)


async def get_current_user_id(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """
    Extract user_id from JWT token if present.
    Returns None for anonymous users.
    """
    if not credentials:
        return None

    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if not user_id:
            return None
        return user_id
    except HTTPException:
        return None


async def get_session_id(
    session_id_cookie: Optional[str] = Cookie(
        None,
        alias=settings.ANONYMOUS_SESSION_COOKIE_NAME
    ),
    user_id: Optional[str] = Depends(get_current_user_id)
) -> str:
    """
    Get or create session ID for the user.
    For authenticated users, uses user_id.
    For anonymous users, uses cookie or generates new UUID.
    """
    if user_id:
        # Authenticated user - session tied to user_id
        return f"user_{user_id}"

    if session_id_cookie:
        # Returning anonymous user with existing session
        return session_id_cookie

    # New anonymous user - generate new session ID
    return str(uuid.uuid4())


async def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> str:
    """
    Require authentication for protected routes.
    Returns user_id if authenticated, raises 401 otherwise.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(credentials.credentials)
    user_id = payload.get("sub")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )

    return user_id
