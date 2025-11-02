from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from pydantic import BaseModel

from app.db.mongodb import get_database
from app.services.vector_store import vector_store_service
from app.services.embeddings import embedding_service
from app.api.dependencies import require_auth


router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentResponse(BaseModel):
    """Response model for a single document."""
    id: str
    score: float
    text: str
    metadata: dict


class DocumentsListResponse(BaseModel):
    """Response model for documents list."""
    total: int
    documents: List[DocumentResponse]


@router.get("", response_model=DocumentsListResponse)
async def list_documents(
    user_id: str = Depends(require_auth),
    limit: int = 100,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    List all documents in the Pinecone knowledge base.
    Only authenticated users can access this endpoint.
    """

    try:
        # Initialize index if needed
        if not vector_store_service.index:
            vector_store_service.initialize_index()

        # Try to use Pinecone's list() API for efficient retrieval
        all_documents = {}

        try:
            # Use list() to get vector IDs (more efficient than querying)
            list_results = vector_store_service.index.list(namespace="")
            vector_ids = []

            # Collect IDs from list results
            for id_item in list_results:
                vector_ids.append(str(id_item))
                if len(vector_ids) >= limit:
                    break

            # Fetch vectors by ID with metadata
            if vector_ids:
                fetch_results = vector_store_service.index.fetch(ids=vector_ids, namespace="")

                for vector_id, vector_data in fetch_results.vectors.items():
                    # Manually serialize metadata to avoid circular references
                    clean_metadata = {}
                    raw_metadata = vector_data.metadata or {}
                    for k, v in raw_metadata.items():
                        if k != "text":
                            if isinstance(v, (str, int, float, bool, type(None))):
                                clean_metadata[k] = v
                            else:
                                clean_metadata[k] = str(v)

                    all_documents[vector_id] = {
                        "id": str(vector_id),
                        "score": 1.0,  # No relevance score for listing
                        "text": str(raw_metadata.get("text", "")),
                        "metadata": clean_metadata
                    }

        except (AttributeError, Exception) as e:
            # Fallback: Use a single broad query if list() is not available
            # Create a generic embedding for broad retrieval
            query_embedding = await embedding_service.generate_embedding("financial services banking transfer payment")

            results = vector_store_service.index.query(
                vector=query_embedding,
                top_k=min(limit, 1000),
                include_metadata=True,
                namespace=""
            )

            for match in results.matches:
                # Manually serialize metadata to avoid circular references
                clean_metadata = {}
                for k, v in match.metadata.items():
                    if k != "text":
                        if isinstance(v, (str, int, float, bool, type(None))):
                            clean_metadata[k] = v
                        else:
                            clean_metadata[k] = str(v)

                all_documents[match.id] = {
                    "id": str(match.id),
                    "score": float(match.score),
                    "text": str(match.metadata.get("text", "")),
                    "metadata": clean_metadata
                }

        # Convert to list and sort by ID for consistency
        documents = sorted(all_documents.values(), key=lambda x: x["id"])

        # Use Pydantic for proper serialization with clean data
        response = DocumentsListResponse(
            total=len(documents),
            documents=documents
        )
        return response.model_dump(mode='json')

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching documents: {str(e)}"
        )


@router.get("/stats")
async def get_documents_stats(
    user_id: str = Depends(require_auth),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Get statistics about the Pinecone knowledge base.
    Only authenticated users can access this endpoint.
    """

    try:
        # Initialize index if needed
        if not vector_store_service.index:
            vector_store_service.initialize_index()

        # Get index stats (returns Pinecone object)
        stats = vector_store_service.get_index_stats()

        # Extract values directly from stats object before serialization
        total_vectors = 0
        dimension = 0
        namespaces = {}

        # Try different attribute/key access patterns
        if hasattr(stats, 'total_vector_count'):
            total_vectors = stats.total_vector_count
        elif hasattr(stats, '__getitem__'):
            total_vectors = stats.get('total_vector_count', 0)

        if hasattr(stats, 'dimension'):
            dimension = stats.dimension
        elif hasattr(stats, '__getitem__'):
            dimension = stats.get('dimension', 0)

        if hasattr(stats, 'namespaces'):
            namespaces_obj = stats.namespaces
            # Convert namespaces to dict
            if isinstance(namespaces_obj, dict):
                namespaces = {}
                for ns_name, ns_data in namespaces_obj.items():
                    if hasattr(ns_data, 'vector_count'):
                        namespaces[str(ns_name)] = {"vector_count": ns_data.vector_count}
                    elif isinstance(ns_data, dict):
                        namespaces[str(ns_name)] = {"vector_count": ns_data.get('vector_count', 0)}
                    else:
                        namespaces[str(ns_name)] = str(ns_data)
        elif hasattr(stats, '__getitem__'):
            namespaces_data = stats.get('namespaces', {})
            if isinstance(namespaces_data, dict):
                namespaces = {str(k): {"vector_count": v.get('vector_count', 0) if isinstance(v, dict) else 0}
                              for k, v in namespaces_data.items()}

        return {
            "total_vectors": int(total_vectors) if total_vectors else 0,
            "dimension": int(dimension) if dimension else 0,
            "namespaces": namespaces
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching stats: {str(e)}"
        )
