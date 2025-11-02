from openai import AsyncOpenAI
from app.core.config import settings
from app.services.vector_store import vector_store_service
from app.models.chat import Message, MessageRole
from typing import List, Dict, Any, AsyncGenerator
import json


class ChatService:
    """Service for handling chat interactions with RAG."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL

        self.system_prompt = """You are a helpful AI assistant for Eloquent, a fintech company.
You answer questions about account management, payments, security, regulations, and technical support.

Use the provided context from the FAQ knowledge base to answer questions accurately.
If the context doesn't contain relevant information, politely say you don't have that information
and suggest the user contact support.

Always be professional, clear, and concise in your responses."""

    async def generate_response(
        self,
        user_message: str,
        conversation_history: List[Message]
    ) -> tuple[str, List[Dict[str, Any]]]:
        """
        Generate AI response using RAG.

        Args:
            user_message: The user's message
            conversation_history: Previous messages in the conversation

        Returns:
            Tuple of (response_text, retrieved_sources)
        """
        # Step 1: Retrieve relevant context from vector store
        retrieved_docs = await vector_store_service.search_similar(
            query=user_message,
            top_k=settings.PINECONE_TOP_K
        )

        # Step 2: Prepare context from retrieved documents
        context = self._format_context(retrieved_docs)

        # Step 3: Build messages for OpenAI
        messages = self._build_messages(
            user_message=user_message,
            context=context,
            conversation_history=conversation_history
        )

        # Step 4: Generate response
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=settings.OPENAI_MAX_TOKENS
        )

        assistant_message = response.choices[0].message.content

        return assistant_message, retrieved_docs

    async def generate_response_stream(
        self,
        user_message: str,
        conversation_history: List[Message]
    ) -> AsyncGenerator[str, None]:
        """
        Generate AI response with streaming for real-time display.

        Args:
            user_message: The user's message
            conversation_history: Previous messages in the conversation

        Yields:
            Chunks of the response text
        """
        # Retrieve context
        retrieved_docs = await vector_store_service.search_similar(
            query=user_message,
            top_k=settings.PINECONE_TOP_K
        )

        context = self._format_context(retrieved_docs)

        messages = self._build_messages(
            user_message=user_message,
            context=context,
            conversation_history=conversation_history
        )

        # Stream response
        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=settings.OPENAI_TEMPERATURE,
            max_tokens=settings.OPENAI_MAX_TOKENS,
            stream=True
        )

        # First, send sources as JSON
        yield json.dumps({"type": "sources", "data": retrieved_docs}) + "\n"

        # Then stream the response
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield json.dumps({
                    "type": "content",
                    "data": chunk.choices[0].delta.content
                }) + "\n"

    def _format_context(self, retrieved_docs: List[Dict[str, Any]]) -> str:
        """Format retrieved documents into context string."""
        if not retrieved_docs:
            return "No relevant FAQ information found."

        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            category = doc["metadata"].get("category", "General")
            context_parts.append(
                f"[Source {i} - {category}]\n{doc['text']}\n"
            )

        return "\n".join(context_parts)

    def _build_messages(
        self,
        user_message: str,
        context: str,
        conversation_history: List[Message]
    ) -> List[Dict[str, str]]:
        """Build message list for OpenAI API."""
        messages = [
            {"role": "system", "content": self.system_prompt}
        ]

        # Add conversation history (limit to last 10 messages to stay within token limits)
        for msg in conversation_history[-10:]:
            messages.append({
                "role": msg.role.value,
                "content": msg.content
            })

        # Add current user message with context
        user_message_with_context = f"""Context from FAQ:
{context}

User Question: {user_message}"""

        messages.append({
            "role": "user",
            "content": user_message_with_context
        })

        return messages

    async def generate_session_title(self, first_message: str) -> str:
        """Generate a concise title for the chat session based on the first message."""
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # Use faster model for title generation
                messages=[
                    {
                        "role": "system",
                        "content": "Generate a short, concise title (max 6 words) for a chat conversation based on the user's first message."
                    },
                    {
                        "role": "user",
                        "content": first_message
                    }
                ],
                max_tokens=20,
                temperature=0.7
            )
            return response.choices[0].message.content.strip()
        except Exception:
            # Fallback to first 50 characters if title generation fails
            return first_message[:50] + ("..." if len(first_message) > 50 else "")


# Singleton instance
chat_service = ChatService()
