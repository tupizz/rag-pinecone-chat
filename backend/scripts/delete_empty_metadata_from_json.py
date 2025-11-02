"""
Script to delete Pinecone vectors with empty metadata from a JSON query result.

This script takes the JSON output from a Pinecone query and deletes all documents
that have empty metadata (no question, answer, or category).

Usage:
    1. Save your query results to a JSON file (e.g., query_results.json)
    2. Run: python scripts/delete_empty_metadata_from_json.py query_results.json [--dry-run]
"""

import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.services.vector_store import vector_store_service


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

    # Also check for documents that only have "source" field (scraped web content)
    only_has_source = (
        "source" in metadata and
        not has_question and
        not has_answer and
        not has_category
    )

    # If it has none of the important fields, or only has source, consider it for deletion
    return not (has_question or has_answer or has_category)


def cleanup_from_json(json_file_path: str, dry_run: bool = True):
    """
    Main cleanup function that reads from JSON file.

    Args:
        json_file_path: Path to JSON file with query results
        dry_run: If True, only show what would be deleted without actually deleting
    """
    print("=" * 70)
    print("Pinecone Vector Database Cleanup Script (From JSON)")
    print("=" * 70)
    print()

    # Read JSON file
    try:
        with open(json_file_path, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File '{json_file_path}' not found")
        return
    except json.JSONDecodeError:
        print(f"❌ Error: Invalid JSON in file '{json_file_path}'")
        return

    documents = data.get("documents", [])

    if not documents:
        print("❌ No documents found in JSON file")
        return

    print(f"📁 Loaded {len(documents)} documents from {json_file_path}")
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

    # Filter documents with empty metadata
    empty_metadata_docs = [doc for doc in documents if has_empty_metadata(doc)]
    valid_metadata_docs = [doc for doc in documents if not has_empty_metadata(doc)]

    print(f"📊 Analysis Results:")
    print(f"   Total documents: {len(documents)}")
    print(f"   Documents with empty/invalid metadata: {len(empty_metadata_docs)}")
    print(f"   Documents with valid metadata: {len(valid_metadata_docs)}")
    print()

    if not empty_metadata_docs:
        print("✅ No documents with empty metadata found. All documents are valid!")
        return

    # Show sample of documents to be deleted
    print("📋 Documents with empty metadata that will be deleted:")
    print()
    for i, doc in enumerate(empty_metadata_docs, 1):
        text_preview = doc["text"][:80] + "..." if len(doc["text"]) > 80 else doc["text"]
        score = doc.get("score", "N/A")
        metadata_preview = str(doc["metadata"])[:100]

        print(f"{i}. ID: {doc['id']}")
        print(f"   Score: {score}")
        print(f"   Text: {text_preview}")
        print(f"   Metadata: {metadata_preview}")
        print()

    # Extract IDs to delete
    ids_to_delete = [doc["id"] for doc in empty_metadata_docs]

    if dry_run:
        print("=" * 70)
        print(f"✅ DRY RUN COMPLETE - Would delete {len(ids_to_delete)} documents")
        print()
        print("IDs that would be deleted:")
        for i, doc_id in enumerate(ids_to_delete, 1):
            print(f"   {i}. {doc_id}")
        print()
        print("To actually delete these documents, run:")
        print(f"   python scripts/delete_empty_metadata_from_json.py {json_file_path} --live")
    else:
        print(f"🗑️  Deleting {len(ids_to_delete)} documents from Pinecone...")
        vector_store_service.delete_by_ids(ids_to_delete)
        print(f"✅ Successfully deleted {len(ids_to_delete)} documents!")

        # Show updated stats
        stats = vector_store_service.get_index_stats()
        print()
        print("📊 Updated index statistics:")
        print(f"   Total vectors: {stats.get('total_vector_count', 'N/A')}")

    print()
    print("=" * 70)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Delete Pinecone vectors with empty metadata from JSON query results"
    )
    parser.add_argument(
        "json_file",
        type=str,
        help="Path to JSON file containing query results"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Actually delete the vectors (default is dry-run mode)"
    )

    args = parser.parse_args()

    # Run cleanup
    cleanup_from_json(args.json_file, dry_run=not args.live)
