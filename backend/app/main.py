from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# from fastapi.middleware.gzip import GZipMiddleware  # Disabled - breaks streaming
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging_config import setup_logging, get_logger
from app.db.mongodb import MongoDB
from app.services.vector_store import vector_store_service
from app.api import chat, auth, admin, documents, health
from app.middleware.request_tracking import RequestTrackingMiddleware
from app.middleware.rate_limiter import limiter

# Setup logging based on environment
setup_logging(
    level=settings.LOG_LEVEL,
    json_logs=settings.ENVIRONMENT == "production"
)

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting application", extra={"extra_data": {"project": settings.PROJECT_NAME}})

    await MongoDB.connect()
    logger.info("MongoDB connection established")

    # Try to initialize Pinecone, but don't fail if API keys are invalid
    try:
        vector_store_service.initialize_index()
        logger.info("Pinecone initialized successfully")
    except Exception as e:
        logger.warning(
            "Pinecone initialization failed - chat functionality will not work",
            extra={"extra_data": {"error": str(e)}}
        )

    logger.info("Application startup complete", extra={"extra_data": {"project": settings.PROJECT_NAME}})

    yield

    # Shutdown
    logger.info("Starting application shutdown")
    await MongoDB.close()
    logger.info("MongoDB connection closed")
    logger.info("Application shutdown complete")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Add rate limiter state and exception handler
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# NOTE: GZipMiddleware is disabled because it buffers streaming responses
# This prevents Server-Sent Events (SSE) from working properly
# Most modern proxies/CDNs handle compression anyway
# app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add request tracking middleware (before CORS)
app.add_middleware(RequestTrackingMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],  # Expose request ID header to clients
)

# Include routers
app.include_router(health.router)  # No prefix for health checks
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Welcome to Eloquent AI Chatbot API",
        "docs": "/docs",
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.BACKEND_RELOAD
    )
