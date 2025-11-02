from openai import AsyncOpenAI
from app.core.config import settings
from typing import List
import tiktoken


class EmbeddingService:
    """Service for generating text embeddings using OpenAI."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_EMBEDDING_MODEL
        self.encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding vector
        """
        response = await self.client.embeddings.create(
            input=text,
            model=self.model
        )
        return response.data[0].embedding

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in a batch.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        response = await self.client.embeddings.create(
            input=texts,
            model=self.model
        )
        return [item.embedding for item in response.data]

    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in a text."""
        return len(self.encoding.encode(text))


# Singleton instance
embedding_service = EmbeddingService()
