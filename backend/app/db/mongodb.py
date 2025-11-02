from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings
from typing import Optional

class MongoDB:
    """MongoDB connection manager."""

    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None

    @classmethod
    async def connect(cls):
        """Connect to MongoDB."""
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
        cls.db = cls.client[settings.MONGODB_DB_NAME]

        # Create indexes
        await cls.create_indexes()
        print(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")

    @classmethod
    async def close(cls):
        """Close MongoDB connection."""
        if cls.client:
            cls.client.close()
            print("Closed MongoDB connection")

    @classmethod
    async def create_indexes(cls):
        """Create database indexes for optimal query performance."""
        if cls.db is None:
            return

        # Sessions collection indexes
        await cls.db.sessions.create_index("session_id", unique=True)
        await cls.db.sessions.create_index("user_id")
        await cls.db.sessions.create_index("created_at")
        await cls.db.sessions.create_index("updated_at")

        # Messages collection indexes (NEW)
        await cls.db.messages.create_index("message_id", unique=True)
        await cls.db.messages.create_index("session_id")
        await cls.db.messages.create_index("timestamp")
        # Compound index for efficient pagination within a session
        await cls.db.messages.create_index([("session_id", 1), ("timestamp", -1)])

        # Users collection indexes
        await cls.db.users.create_index("email", unique=True)
        await cls.db.users.create_index("user_id", unique=True)

    @classmethod
    def get_db(cls) -> AsyncIOMotorDatabase:
        """Get database instance."""
        if cls.db is None:
            raise RuntimeError("Database not connected")
        return cls.db


# Dependency for FastAPI
async def get_database() -> AsyncIOMotorDatabase:
    """FastAPI dependency to get database."""
    return MongoDB.get_db()
