"""
Request tracking middleware for distributed tracing and logging.
"""
import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.logging_config import request_id_var, get_logger

logger = get_logger(__name__)


class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track requests with unique IDs and log request/response metadata.

    - Generates unique request ID for each request
    - Logs request start and completion
    - Tracks request duration
    - Adds request ID to response headers for debugging
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and add tracking metadata."""
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))

        # Store request ID in context for logging
        request_id_var.set(request_id)

        # Record start time
        start_time = time.time()

        # Log request start
        logger.info(
            "Request started",
            extra={
                "extra_data": {
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "client_host": request.client.host if request.client else None,
                    "user_agent": request.headers.get("user-agent"),
                }
            },
        )

        # Process request
        try:
            response = await call_next(request)

            # Calculate duration
            duration = time.time() - start_time

            # Log request completion
            logger.info(
                "Request completed",
                extra={
                    "extra_data": {
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "status_code": response.status_code,
                        "duration_ms": round(duration * 1000, 2),
                    }
                },
            )

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as e:
            # Calculate duration
            duration = time.time() - start_time

            # Log error
            logger.error(
                f"Request failed: {str(e)}",
                exc_info=True,
                extra={
                    "extra_data": {
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "duration_ms": round(duration * 1000, 2),
                        "error": str(e),
                    }
                },
            )

            # Re-raise exception to be handled by FastAPI
            raise
