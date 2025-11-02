"""
Enhanced health check endpoint for AWS ECS/ALB monitoring.
"""
from fastapi import APIRouter, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
from datetime import datetime, timezone

from app.db.mongodb import get_database
from app.services.vector_store import vector_store_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def basic_health_check():
    """
    Basic health check endpoint for quick liveness probes.
    Returns 200 if the application is running.
    """
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


@router.get("/health/ready")
async def readiness_check(db: AsyncIOMotorDatabase = Depends(get_database)):
    """
    Readiness check endpoint that verifies all dependencies.
    Used by AWS ECS/ALB to determine if the container is ready to receive traffic.

    Returns:
        - 200: All dependencies are healthy
        - 503: One or more dependencies are unhealthy
    """
    health_status = {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": {},
    }

    overall_healthy = True

    # Check MongoDB connection
    try:
        await db.command("ping")
        health_status["checks"]["mongodb"] = {
            "status": "healthy",
            "message": "Connection successful",
        }
        logger.debug("MongoDB health check passed")
    except Exception as e:
        overall_healthy = False
        health_status["checks"]["mongodb"] = {
            "status": "unhealthy",
            "message": f"Connection failed: {str(e)}",
        }
        logger.error(f"MongoDB health check failed: {str(e)}")

    # Check Pinecone connection
    try:
        # Try to describe the index to verify connectivity
        index = vector_store_service.get_index()
        if index:
            stats = index.describe_index_stats()
            health_status["checks"]["pinecone"] = {
                "status": "healthy",
                "message": "Connection successful",
                "total_vectors": stats.get("total_vector_count", 0),
            }
            logger.debug("Pinecone health check passed")
        else:
            overall_healthy = False
            health_status["checks"]["pinecone"] = {
                "status": "unhealthy",
                "message": "Index not initialized",
            }
            logger.warning("Pinecone health check failed: Index not initialized")
    except Exception as e:
        overall_healthy = False
        health_status["checks"]["pinecone"] = {
            "status": "unhealthy",
            "message": f"Connection failed: {str(e)}",
        }
        logger.error(f"Pinecone health check failed: {str(e)}")

    # Set overall status
    if not overall_healthy:
        health_status["status"] = "unhealthy"
        return health_status, status.HTTP_503_SERVICE_UNAVAILABLE

    return health_status


@router.get("/health/live")
async def liveness_check():
    """
    Liveness check endpoint for container orchestration.
    Returns 200 if the application process is alive (doesn't check dependencies).
    """
    return {"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()}
