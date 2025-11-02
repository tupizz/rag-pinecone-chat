from pinecone import Pinecone, ServerlessSpec
from app.core.config import settings
from app.services.embeddings import embedding_service
from typing import List, Dict, Any, Optional


class VectorStoreService:
    """Service for managing vector storage and retrieval using Pinecone."""

    def __init__(self):
        self.pc = None
        self.index_name = settings.PINECONE_INDEX_NAME
        self.index = None

    def _ensure_initialized(self):
        """Lazy initialization of Pinecone client."""
        if self.pc is None:
            self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)

    def initialize_index(self):
        """Initialize or connect to Pinecone index."""
        self._ensure_initialized()
        # Check if index exists
        existing_indexes = [index.name for index in self.pc.list_indexes()]

        if self.index_name not in existing_indexes:
            # Create index if it doesn't exist
            self.pc.create_index(
                name=self.index_name,
                dimension=1536,  # OpenAI ada-002 embedding dimension
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=settings.PINECONE_ENVIRONMENT
                )
            )

        self.index = self.pc.Index(self.index_name)
        print(f"Connected to Pinecone index: {self.index_name}")

    async def upsert_documents(
        self,
        documents: List[Dict[str, Any]],
        namespace: str = ""
    ):
        """
        Upsert documents to Pinecone index.

        Args:
            documents: List of dicts with 'id', 'text', and 'metadata'
            namespace: Optional namespace for organizing vectors
        """
        if not self.index:
            self.initialize_index()

        # Generate embeddings for all documents
        texts = [doc["text"] for doc in documents]
        embeddings = await embedding_service.generate_embeddings_batch(texts)

        # Prepare vectors for upsert
        vectors = []
        for i, doc in enumerate(documents):
            vectors.append({
                "id": doc["id"],
                "values": embeddings[i],
                "metadata": {
                    **doc.get("metadata", {}),
                    "text": doc["text"]
                }
            })

        # Upsert in batches of 100
        batch_size = 100
        for i in range(0, len(vectors), batch_size):
            batch = vectors[i:i + batch_size]
            self.index.upsert(vectors=batch, namespace=namespace)

        print(f"Upserted {len(vectors)} documents to Pinecone")

    async def search_similar(
        self,
        query: str,
        top_k: Optional[int] = None,
        namespace: str = "",
        filter_dict: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using semantic search.

        Args:
            query: Search query text
            top_k: Number of results to return
            namespace: Optional namespace to search in
            filter_dict: Optional metadata filter

        Returns:
            List of matched documents with scores and metadata
        """
        if not self.index:
            self.initialize_index()

        if top_k is None:
            top_k = settings.PINECONE_TOP_K

        # Generate query embedding
        query_embedding = await embedding_service.generate_embedding(query)

        # Search in Pinecone
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            namespace=namespace,
            filter=filter_dict
        )

        # Filter by similarity threshold and format results
        matched_docs = []
        for match in results.matches:
            if match.score >= settings.PINECONE_SIMILARITY_THRESHOLD:
                matched_docs.append({
                    "id": match.id,
                    "score": match.score,
                    "text": match.metadata.get("text", ""),
                    "metadata": {
                        k: v for k, v in match.metadata.items() if k != "text"
                    }
                })

        return matched_docs

    def delete_by_ids(self, ids: List[str], namespace: str = ""):
        """
        Delete vectors by their IDs.

        Args:
            ids: List of vector IDs to delete
            namespace: Optional namespace
        """
        if not self.index:
            self.initialize_index()

        if not ids:
            return

        # Delete in batches of 1000 (Pinecone limit)
        batch_size = 1000
        for i in range(0, len(ids), batch_size):
            batch = ids[i:i + batch_size]
            self.index.delete(ids=batch, namespace=namespace)

        print(f"Deleted {len(ids)} vectors from Pinecone")

    def delete_namespace(self, namespace: str):
        """Delete all vectors in a namespace."""
        if not self.index:
            self.initialize_index()
        self.index.delete(delete_all=True, namespace=namespace)

    def get_index_stats(self) -> Dict[str, Any]:
        """Get statistics about the index."""
        if not self.index:
            self.initialize_index()
        return self.index.describe_index_stats()

    def get_index(self):
        """Get the Pinecone index instance."""
        return self.index


# Singleton instance
vector_store_service = VectorStoreService()
