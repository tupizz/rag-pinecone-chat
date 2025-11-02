"""
Rate limiting middleware to protect against API abuse.
"""
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request

# Create limiter instance with custom key function
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Default rate limit for all endpoints
    storage_uri="memory://",  # Use in-memory storage (for production, use Redis)
)


def get_limiter() -> Limiter:
    """Get the rate limiter instance."""
    return limiter


# Custom rate limits for different endpoint types
RATE_LIMITS = {
    "auth": "5/minute",  # Stricter limit for authentication
    "chat": "20/minute",  # Moderate limit for chat endpoints
    "documents": "50/minute",  # Higher limit for read operations
    "admin": "10/minute",  # Moderate limit for admin endpoints
}
