from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from typing import Optional
import uuid

from app.db.mongodb import get_database
from app.models.chat import (
    ChatRequest,
    ChatResponse,
    ChatMessage,
    Message,
    MessageRole,
    SessionListResponse,
    SessionMessagesResponse,
)
from app.services.chat_service import chat_service
from app.api.dependencies import get_current_user_id, get_session_id
from app.core.config import settings

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def send_message(
    request: ChatRequest,
    response: Response,
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Send a message and get AI response.
    Creates a new session if session_id is not provided.
    """
    session_id = request.session_id

    # Create new session if needed
    if not session_id:
        session_id = str(uuid.uuid4())
        session_doc = {
            "session_id": session_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "title": None,
        }
        await db.sessions.insert_one(session_doc)

        # Set session cookie for anonymous users
        if not user_id:
            response.set_cookie(
                key=settings.ANONYMOUS_SESSION_COOKIE_NAME,
                value=session_id,
                max_age=settings.ANONYMOUS_SESSION_MAX_AGE,
                httponly=True,
                samesite="lax",
            )
    else:
        # Verify session exists and belongs to user
        session_doc = await db.sessions.find_one({"session_id": session_id})
        if not session_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )

        # Check authorization
        if user_id and session_doc.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this session",
            )

    # Get recent conversation history (last 10 messages for AI context)
    recent_messages = (
        await db.messages.find({"session_id": session_id})
        .sort([("timestamp", -1), ("_id", -1)])
        .limit(10)
        .to_list(length=10)
    )

    # Reverse to get chronological order and handle legacy source format
    conversation_history = []
    for msg in reversed(recent_messages):
        # Handle legacy sources (list of IDs) vs new format (list of dicts)
        if msg.get("sources") and isinstance(msg["sources"][0], str):
            msg["sources"] = []

        # Ensure timestamp is timezone-aware (MongoDB may return timezone-naive)
        if msg.get("timestamp") and msg["timestamp"].tzinfo is None:
            msg["timestamp"] = msg["timestamp"].replace(tzinfo=timezone.utc)

        conversation_history.append(ChatMessage(**msg))

    # Generate AI response with RAG
    ai_response, sources = await chat_service.generate_response(
        user_message=request.message, conversation_history=conversation_history
    )

    # Create messages with IDs (ensure user message timestamp is before assistant)
    user_timestamp = datetime.now(timezone.utc)
    user_message = ChatMessage(
        session_id=session_id,
        role=MessageRole.USER,
        content=request.message,
        timestamp=user_timestamp,
    )

    # Serialize sources properly to avoid recursion errors
    serialized_sources = []
    for src in sources[:3]:
        # Clean metadata to ensure JSON serialization
        clean_metadata = {}
        raw_metadata = src.get("metadata", {})
        for k, v in raw_metadata.items():
            if isinstance(v, (str, int, float, bool, type(None))):
                clean_metadata[k] = v
            else:
                clean_metadata[k] = str(v)

        serialized_sources.append({
            "id": str(src.get("id", "")),
            "score": float(src.get("score", 0.0)),
            "text": str(src.get("text", "")),
            "metadata": clean_metadata
        })

    assistant_timestamp = datetime.now(timezone.utc)
    assistant_message = ChatMessage(
        session_id=session_id,
        role=MessageRole.ASSISTANT,
        content=ai_response,
        timestamp=assistant_timestamp,
        sources=serialized_sources,
    )

    # Generate title for new sessions
    session_doc = await db.sessions.find_one({"session_id": session_id})
    title = session_doc.get("title")
    if not title and len(conversation_history) == 0:
        title = await chat_service.generate_session_title(request.message)

    # Insert messages to messages collection
    await db.messages.insert_many([user_message.dict(), assistant_message.dict()])

    # Update session metadata (title and timestamp only)
    await db.sessions.update_one(
        {"session_id": session_id}, {"$set": {"updated_at": assistant_timestamp, "title": title}}
    )

    # Use Pydantic for proper serialization with clean data
    response = ChatResponse(
        session_id=session_id,
        message=assistant_message,
        sources=serialized_sources,
    )

    # Use Pydantic's JSON-safe serialization (timezone-aware datetimes auto-include TZ)
    return response.model_dump(mode='json')


@router.post("/stream")
async def send_message_stream(
    request: ChatRequest,
    response: Response,
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Send a message and get streaming AI response.
    """
    session_id = request.session_id

    # Similar session creation/validation logic as above
    if not session_id:
        session_id = str(uuid.uuid4())
        session_doc = {
            "session_id": session_id,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "title": None,
        }
        await db.sessions.insert_one(session_doc)

        if not user_id:
            response.set_cookie(
                key=settings.ANONYMOUS_SESSION_COOKIE_NAME,
                value=session_id,
                max_age=settings.ANONYMOUS_SESSION_MAX_AGE,
                httponly=True,
                samesite="lax",
            )
    else:
        session_doc = await db.sessions.find_one({"session_id": session_id})
        if not session_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )

    # Get recent conversation history (last 10 messages for AI context)
    recent_messages = (
        await db.messages.find({"session_id": session_id})
        .sort([("timestamp", -1), ("_id", -1)])
        .limit(10)
        .to_list(length=10)
    )

    # Reverse to get chronological order and handle legacy source format
    conversation_history = []
    for msg in reversed(recent_messages):
        # Handle legacy sources (list of IDs) vs new format (list of dicts)
        if msg.get("sources") and isinstance(msg["sources"][0], str):
            msg["sources"] = []

        # Ensure timestamp is timezone-aware (MongoDB may return timezone-naive)
        if msg.get("timestamp") and msg["timestamp"].tzinfo is None:
            msg["timestamp"] = msg["timestamp"].replace(tzinfo=timezone.utc)

        conversation_history.append(ChatMessage(**msg))

    # Get session for title check
    session_doc = await db.sessions.find_one({"session_id": session_id})

    # Stream response
    async def generate_stream():
        import json

        # Send session_id first
        yield f"data: {{'session_id': '{session_id}'}}\n\n"

        full_response = ""
        sources = []

        async for chunk in chat_service.generate_response_stream(
            user_message=request.message, conversation_history=conversation_history
        ):
            yield f"data: {chunk}\n\n"

            # Parse and collect data for database
            try:
                data = json.loads(chunk.strip())
                if data.get("type") == "content":
                    full_response += data["data"]
                elif data.get("type") == "sources":
                    sources = data["data"]
            except json.JSONDecodeError:
                pass

        # Signal stream completion
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

        # After streaming completes, save to database (ensure user timestamp is before assistant)
        user_timestamp = datetime.now(timezone.utc)
        user_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.USER,
            content=request.message,
            timestamp=user_timestamp,
        )

        # Serialize sources properly to avoid recursion errors
        serialized_sources = []
        for src in sources[:3] if sources else []:
            # Clean metadata to ensure JSON serialization
            clean_metadata = {}
            raw_metadata = src.get("metadata", {})
            for k, v in raw_metadata.items():
                if isinstance(v, (str, int, float, bool, type(None))):
                    clean_metadata[k] = v
                else:
                    clean_metadata[k] = str(v)

            serialized_sources.append({
                "id": str(src.get("id", "")),
                "score": float(src.get("score", 0.0)),
                "text": str(src.get("text", "")),
                "metadata": clean_metadata
            })

        assistant_timestamp = datetime.now(timezone.utc)
        assistant_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=full_response,
            timestamp=assistant_timestamp,
            sources=serialized_sources,
        )

        title = session_doc.get("title")
        if not title and len(conversation_history) == 0:
            title = await chat_service.generate_session_title(request.message)

        # Insert messages to messages collection
        await db.messages.insert_many([user_message.dict(), assistant_message.dict()])

        # Update session metadata (title and timestamp only)
        await db.sessions.update_one(
            {"session_id": session_id}, {"$set": {"updated_at": assistant_timestamp, "title": title}}
        )

    return StreamingResponse(generate_stream(), media_type="text/event-stream")


@router.get("/sessions", response_model=SessionListResponse)
async def list_sessions(
    user_id: Optional[str] = Depends(get_current_user_id),
    session_id: Optional[str] = Depends(get_session_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    List all sessions for the current user.
    For anonymous users, returns only their current session.
    """
    if user_id:
        # Authenticated user - return all their sessions
        sessions = (
            await db.sessions.find({"user_id": user_id})
            .sort("updated_at", -1)
            .to_list(length=100)
        )
    else:
        # Anonymous user - return only current session
        sessions = await db.sessions.find({"session_id": session_id}).to_list(length=1)

    # Format response with message metadata from messages collection
    session_list = []
    for session in sessions:
        session_id = session["session_id"]

        # Get message count
        message_count = await db.messages.count_documents({"session_id": session_id})

        # Get last message for preview
        last_message_doc = await db.messages.find_one(
            {"session_id": session_id}, sort=[("timestamp", -1)]
        )

        # Ensure updated_at is timezone-aware (MongoDB may return timezone-naive)
        updated_at = session["updated_at"]
        if updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)

        session_list.append(
            {
                "session_id": session_id,
                "title": session.get("title") or "New Chat",
                "updated_at": updated_at.isoformat(),
                "message_count": message_count,
                "last_message_preview": (
                    last_message_doc["content"][:100] if last_message_doc else None
                ),
            }
        )

    response = SessionListResponse(sessions=session_list)
    return response.model_dump(mode='json')


@router.get("/sessions/{session_id}/messages", response_model=SessionMessagesResponse)
async def get_session_messages(
    session_id: str,
    limit: int = 50,
    cursor: Optional[str] = None,
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Get messages for a specific session with pagination.

    Args:
        limit: Number of messages to return (default: 50, max: 100)
        cursor: Message ID to start from (for pagination)
    """
    # Limit max page size
    limit = min(limit, 100)

    session = await db.sessions.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    # Check authorization for authenticated users
    if user_id and session.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session",
        )

    # Build query
    query = {"session_id": session_id}
    if cursor:
        # Get messages after this cursor (older messages)
        cursor_message = await db.messages.find_one({"message_id": cursor})
        if cursor_message:
            query["timestamp"] = {"$lt": cursor_message["timestamp"]}

    # Fetch messages with pagination (sort by timestamp DESC, then _id DESC for consistent ordering)
    messages_cursor = db.messages.find(query).sort([("timestamp", -1), ("_id", -1)]).limit(limit + 1)
    messages_list = await messages_cursor.to_list(length=limit + 1)

    # Check if there are more messages
    has_more = len(messages_list) > limit
    if has_more:
        messages_list = messages_list[:limit]

    # Reverse to get chronological order
    messages_list.reverse()

    # Convert to ChatMessage objects, handling legacy source format
    messages = []
    for msg in messages_list:
        # Handle legacy sources (list of IDs) vs new format (list of dicts)
        if msg.get("sources"):
            sources = msg["sources"]
            # If sources are strings (legacy format), convert to empty list
            # Frontend will handle this gracefully
            if sources and isinstance(sources[0], str):
                msg["sources"] = []

        # Ensure timestamp is timezone-aware (MongoDB may return timezone-naive)
        if msg.get("timestamp") and msg["timestamp"].tzinfo is None:
            msg["timestamp"] = msg["timestamp"].replace(tzinfo=timezone.utc)

        messages.append(ChatMessage(**msg))

    # Get total count
    total_count = await db.messages.count_documents({"session_id": session_id})

    # Next cursor
    next_cursor = messages_list[0]["message_id"] if has_more and messages_list else None

    response = SessionMessagesResponse(
        session_id=session_id,
        messages=messages,
        total_count=total_count,
        has_more=has_more,
        cursor=next_cursor,
    )

    # Use Pydantic serialization (timezone-aware datetimes auto-include TZ)
    return response.model_dump(mode='json')


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    user_id: Optional[str] = Depends(get_current_user_id),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Delete a chat session.
    """
    session = await db.sessions.find_one({"session_id": session_id})

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
        )

    # Check authorization
    if user_id and session.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this session",
        )

    await db.sessions.delete_one({"session_id": session_id})

    return {"message": "Session deleted successfully"}
