"""
Script to clean up Pinecone vectors with empty or minimal metadata.

This script will:
1. Query the vector database for all documents
2. Identify documents with empty metadata (no question, answer, or category)
3. Delete those documents from Pinecone

Usage:
    python scripts/cleanup_empty_metadata.py [--dry-run]
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.services.vector_store import vector_store_service
from app.services.embeddings import embedding_service


async def query_all_documents(sample_query: str = "", top_k: int = 10000):
    """
    Query Pinecone to get a large sample of documents.
    Note: Pinecone doesn't provide a "fetch all" method, so we use a generic query.
    """
    print(f"Querying Pinecone with sample query to fetch documents...")

    # Initialize the index
    vector_store_service.initialize_index()

    # Generate embedding for the query
    query_embedding = await embedding_service.generate_embedding(sample_query)

    # Query without similarity threshold to get many results
    results = vector_store_service.index.query(
        vector=query_embedding, top_k=top_k, include_metadata=True, namespace=""
    )

    documents = []
    for match in results.matches:
        documents.append(
            {
                "id": match.id,
                "score": match.score,
                "text": match.metadata.get("text", ""),
                "metadata": {k: v for k, v in match.metadata.items() if k != "text"},
            }
        )

    print(f"Retrieved {len(documents)} documents from Pinecone")
    return documents


def has_empty_metadata(doc):
    """
    Check if a document has empty or minimal metadata.
    A document is considered to have empty metadata if it lacks all of:
    - question
    - answer
    - category
    """
    metadata = doc.get("metadata", {})

    # If metadata is completely empty
    if not metadata:
        return True

    # Check if it has none of the important fields
    has_question = "question" in metadata and metadata["question"]
    has_answer = "answer" in metadata and metadata["answer"]
    has_category = "category" in metadata and metadata["category"]

    # If it has none of these important fields, consider it empty
    return not (has_question or has_answer or has_category)


async def cleanup_empty_metadata(dry_run: bool = True):
    """
    Main cleanup function.

    Args:
        dry_run: If True, only show what would be deleted without actually deleting
    """
    print("=" * 70)
    print("Pinecone Vector Database Cleanup Script")
    print("=" * 70)
    print()

    if dry_run:
        print("🔍 DRY RUN MODE - No vectors will be deleted")
        print()
    else:
        print("⚠️  LIVE MODE - Vectors will be permanently deleted!")
        print()
        response = input("Are you sure you want to continue? (yes/no): ")
        if response.lower() != "yes":
            print("Cleanup cancelled.")
            return
        print()

    # Query for documents
    documents = await query_all_documents(top_k=10000)

    if not documents:
        print("No documents found in the database.")
        return

    # Filter documents with empty metadata
    empty_metadata_docs = [doc for doc in documents if has_empty_metadata(doc)]

    print(f"📊 Analysis Results:")
    print(f"   Total documents queried: {len(documents)}")
    print(f"   Documents with empty metadata: {len(empty_metadata_docs)}")
    print(
        f"   Documents with valid metadata: {len(documents) - len(empty_metadata_docs)}"
    )
    print()

    if not empty_metadata_docs:
        print("✅ No documents with empty metadata found. Database is clean!")
        return

    # Show sample of documents to be deleted
    print("📋 Sample of documents with empty metadata (first 10):")
    for i, doc in enumerate(empty_metadata_docs[:10], 1):
        text_preview = (
            doc["text"][:60] + "..." if len(doc["text"]) > 60 else doc["text"]
        )
        print(f"   {i}. ID: {doc['id']}")
        print(f"      Text: {text_preview}")
        print(f"      Metadata: {doc['metadata']}")
        print()

    if len(empty_metadata_docs) > 10:
        print(f"   ... and {len(empty_metadata_docs) - 10} more")
        print()

    # Extract IDs to delete
    ids_to_delete = [doc["id"] for doc in empty_metadata_docs]

    if dry_run:
        print(f"✅ DRY RUN COMPLETE - Would delete {len(ids_to_delete)} documents")
        print()
        print("To actually delete these documents, run:")
        print("   python scripts/cleanup_empty_metadata.py --live")
    else:
        print(f"🗑️  Deleting {len(ids_to_delete)} documents...")
        vector_store_service.delete_by_ids(ids_to_delete)
        print(f"✅ Successfully deleted {len(ids_to_delete)} documents!")

        # Show updated stats
        stats = vector_store_service.get_index_stats()
        print()
        print("📊 Updated index statistics:")
        print(f"   Total vectors: {stats.get('total_vector_count', 'N/A')}")
        print(f"   Namespaces: {stats.get('namespaces', {})}")

    print()
    print("=" * 70)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Clean up Pinecone vectors with empty metadata"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Actually delete the vectors (default is dry-run mode)",
    )

    args = parser.parse_args()

    # Run cleanup
    asyncio.run(cleanup_empty_metadata(dry_run=not args.live))
