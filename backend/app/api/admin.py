from fastapi import APIRouter, HTTPException, status, Depends
from app.services.vector_store import vector_store_service
from app.api.dependencies import get_current_user_id
from typing import List, Dict, Any, Optional

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/documents")
async def list_all_documents(
    user_id: Optional[str] = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    List all documents in the Pinecone index.
    Useful for debugging and verifying the knowledge base.
    Requires authentication.
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for admin endpoints"
        )
    try:
        if not vector_store_service.index:
            vector_store_service.initialize_index()

        # Get index statistics
        stats = vector_store_service.get_index_stats()

        response = {
            "index_name": vector_store_service.index_name,
            "total_vectors": int(stats.get("total_vector_count", 0)),
            "dimension": int(stats.get("dimension", 0)),
            "message": "To fetch specific vectors, use the /search-all endpoint or /test-search with a query"
        }

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching documents: {str(e)}"
        )


@router.get("/documents/search-all")
async def search_all_documents(
    limit: int = 100,
    user_id: Optional[str] = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    Search for documents using a generic query to retrieve samples.
    Requires authentication.

    Args:
        limit: Maximum number of documents to return (default: 100)
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for admin endpoints"
        )
    try:
        if not vector_store_service.index:
            vector_store_service.initialize_index()

        # Use a generic query to get diverse results
        queries = [
            "account registration",
            "payment transaction",
            "security fraud",
            "compliance regulation",
            "technical support"
        ]

        all_results = []
        seen_ids = set()

        for query in queries:
            results = await vector_store_service.search_similar(
                query=query,
                top_k=limit // len(queries)
            )

            for result in results:
                if result["id"] not in seen_ids:
                    seen_ids.add(result["id"])
                    all_results.append(result)

        return {
            "total_found": len(all_results),
            "documents": all_results
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching documents: {str(e)}"
        )


@router.get("/documents/stats")
async def get_index_stats(
    user_id: Optional[str] = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    Get detailed statistics about the Pinecone index.
    Requires authentication.
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for admin endpoints"
        )
    try:
        if not vector_store_service.index:
            vector_store_service.initialize_index()

        stats = vector_store_service.get_index_stats()

        # Convert stats to a serializable dictionary
        stats_dict = {
            "total_vector_count": stats.get("total_vector_count", 0),
            "dimension": stats.get("dimension", 0),
            "index_fullness": stats.get("index_fullness", 0),
            "namespaces": {}
        }

        # Convert namespace stats
        if "namespaces" in stats:
            for ns_name, ns_data in stats["namespaces"].items():
                stats_dict["namespaces"][ns_name] = {
                    "vector_count": ns_data.get("vector_count", 0) if isinstance(ns_data, dict) else 0
                }

        return {
            "index_name": vector_store_service.index_name,
            "statistics": stats_dict
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching statistics: {str(e)}"
        )


@router.post("/documents/test-search")
async def test_search(
    query: str,
    top_k: int = 5,
    user_id: Optional[str] = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """
    Test search with a custom query.
    Requires authentication.

    Args:
        query: Search query text
        top_k: Number of results to return
    """
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for admin endpoints"
        )
    try:
        results = await vector_store_service.search_similar(
            query=query,
            top_k=top_k
        )

        return {
            "query": query,
            "results_count": len(results),
            "results": results
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing search: {str(e)}"
        )
