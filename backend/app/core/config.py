from pydantic_settings import BaseSettings
from typing import List
from pydantic import field_validator


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Environment
    ENVIRONMENT: str = "development"  # development, staging, production
    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL

    # API Settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "Eloquent AI Chatbot"

    # Server Settings
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    BACKEND_RELOAD: bool = True

    # CORS
    ALLOWED_ORIGINS_STR: str = "http://localhost:3000"

    @property
    def ALLOWED_ORIGINS(self) -> List[str]:
        """Parse ALLOWED_ORIGINS from comma-separated string."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS_STR.split(",")]

    # MongoDB Settings
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "eloquent_chatbot"

    # OpenAI Settings
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-5-chat-latest"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-ada-002"
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_MAX_TOKENS: int = 1000

    # Pinecone Settings
    PINECONE_API_KEY: str
    PINECONE_ENVIRONMENT: str
    PINECONE_INDEX_NAME: str = "eloquent-faq-index"
    PINECONE_TOP_K: int = 3
    PINECONE_SIMILARITY_THRESHOLD: float = 0.75

    # JWT Settings
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    # Session Settings
    ANONYMOUS_SESSION_COOKIE_NAME: str = "eloquent_session_id"
    ANONYMOUS_SESSION_MAX_AGE: int = 2592000  # 30 days

    model_config = {"env_file": ".env", "case_sensitive": True, "extra": "ignore"}


settings = Settings()
