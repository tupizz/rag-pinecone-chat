from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum
import uuid


def utc_now():
    """Return current UTC time as timezone-aware datetime."""
    return datetime.now(timezone.utc)


class MessageRole(str, Enum):
    """Message role enum."""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class ChatMessage(BaseModel):
    """Chat message model - stored in separate messages collection."""
    message_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=utc_now)
    sources: Optional[List[dict]] = None  # Full source objects with metadata


# Keep Message as alias for backward compatibility
Message = ChatMessage


class ChatSession(BaseModel):
    """Chat session model - pure metadata, no message references."""
    session_id: str
    user_id: Optional[str] = None  # None for anonymous users
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    title: Optional[str] = None  # Auto-generated from first message


class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str
    session_id: Optional[str] = None  # Create new session if None


class ChatResponse(BaseModel):
    """Response model for chat endpoint."""
    session_id: str
    message: Message
    sources: Optional[List[dict]] = None  # Retrieved FAQ chunks


class SessionListResponse(BaseModel):
    """Response model for session list."""
    sessions: List[dict]  # Simplified session info


class SessionMessagesResponse(BaseModel):
    """Response model for session messages with pagination."""
    session_id: str
    messages: List[ChatMessage]
    total_count: int
    has_more: bool
    cursor: Optional[str] = None  # For cursor-based pagination
