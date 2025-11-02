"""
Script to ingest Wise help articles into Pinecone vector database.

This script reads JSON files containing Q&A articles from Wise and uploads them
to Pinecone for use in the RAG chatbot.

Usage:
    python scripts/ingest_wise_articles.py [--dry-run]
"""

import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.services.vector_store import vector_store_service


async def ingest_wise_articles(dry_run: bool = False):
    """
    Main ingestion function.

    Args:
        dry_run: If True, only validate files without uploading to Pinecone
    """
    print("=" * 70)
    print("Wise Help Articles Ingestion Script")
    print("=" * 70)
    print()

    # Define data directory
    data_dir = Path(__file__).parent.parent.parent / "data"

    # Find all wise help article JSON files
    json_files = [
        data_dir / "wise_help_articles.json",
        data_dir / "wise_help_articles_part2.json",
    ]

    # Check if files exist
    existing_files = [f for f in json_files if f.exists()]

    if not existing_files:
        print("❌ Error: No Wise help article JSON files found in data/ directory")
        print(f"   Expected files:")
        for f in json_files:
            print(f"   - {f}")
        return

    print(f"📁 Found {len(existing_files)} JSON file(s):")
    for f in existing_files:
        print(f"   - {f.name}")
    print()

    # Load all documents from JSON files
    all_documents = []

    for json_file in existing_files:
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                documents = data.get("documents", [])
                all_documents.extend(documents)
                print(f"✅ Loaded {len(documents)} documents from {json_file.name}")
        except json.JSONDecodeError as e:
            print(f"❌ Error reading {json_file.name}: {e}")
            return
        except Exception as e:
            print(f"❌ Error loading {json_file.name}: {e}")
            return

    print()
    print(f"📊 Total documents loaded: {len(all_documents)}")
    print()

    if not all_documents:
        print("❌ No documents to ingest")
        return

    # Validate document structure
    print("🔍 Validating document structure...")
    valid_documents = []
    invalid_documents = []

    for doc in all_documents:
        # Check required fields
        if not doc.get("id"):
            invalid_documents.append((doc, "Missing 'id' field"))
            continue

        if not doc.get("text"):
            invalid_documents.append((doc, "Missing 'text' field"))
            continue

        metadata = doc.get("metadata", {})
        if not metadata:
            invalid_documents.append((doc, "Missing 'metadata' field"))
            continue

        valid_documents.append(doc)

    print(f"   ✅ Valid documents: {len(valid_documents)}")
    if invalid_documents:
        print(f"   ⚠️  Invalid documents: {len(invalid_documents)}")
        for doc, reason in invalid_documents[:5]:  # Show first 5
            print(f"      - {doc.get('id', 'unknown')}: {reason}")
    print()

    if not valid_documents:
        print("❌ No valid documents to ingest")
        return

    # Show sample of documents
    print("📋 Sample documents to be ingested (first 3):")
    for doc in valid_documents[:3]:
        print(f"\n   ID: {doc['id']}")
        print(f"   Category: {doc['metadata'].get('category', 'N/A')}")
        print(f"   Question: {doc['metadata'].get('question', 'N/A')[:80]}...")
        print(f"   Answer length: {len(doc['metadata'].get('answer', ''))} characters")
        print(f"   Source: {doc['metadata'].get('source', 'N/A')}")
    print()

    # Group by category
    categories = {}
    for doc in valid_documents:
        category = doc['metadata'].get('category', 'Unknown')
        categories[category] = categories.get(category, 0) + 1

    print("📊 Documents by category:")
    for category, count in sorted(categories.items()):
        print(f"   {category}: {count} documents")
    print()

    if dry_run:
        print("🔍 DRY RUN MODE - Documents validated successfully!")
        print()
        print("To upload to Pinecone, run:")
        print("   python scripts/ingest_wise_articles.py --live")
        print()
        print("=" * 70)
        return

    # Upload to Pinecone
    print("=" * 70)
    print("⚠️  LIVE MODE - Uploading to Pinecone...")
    print()

    response = input(f"Upload {len(valid_documents)} documents to Pinecone? (yes/no): ")
    if response.lower() != "yes":
        print("Upload cancelled.")
        return

    print()
    print("🚀 Starting upload to Pinecone...")
    print()

    try:
        # Initialize vector store
        vector_store_service.initialize_index()

        # Prepare documents for upsert
        docs_to_upsert = []
        for doc in valid_documents:
            docs_to_upsert.append({
                "id": doc["id"],
                "text": doc["text"],
                "metadata": doc["metadata"]
            })

        # Upsert to Pinecone
        await vector_store_service.upsert_documents(docs_to_upsert)

        print()
        print("✅ Successfully uploaded all documents to Pinecone!")
        print()

        # Show updated stats
        stats = vector_store_service.get_index_stats()
        print("📊 Updated Pinecone index statistics:")
        print(f"   Total vectors: {stats.get('total_vector_count', 'N/A')}")
        print(f"   Dimension: {stats.get('dimension', 'N/A')}")
        namespaces = stats.get('namespaces', {})
        if namespaces:
            print(f"   Namespaces:")
            for ns, ns_stats in namespaces.items():
                ns_name = ns if ns else "(default)"
                print(f"      {ns_name}: {ns_stats.get('vector_count', 0)} vectors")

    except Exception as e:
        print(f"❌ Error uploading to Pinecone: {e}")
        print()
        print("Upload failed. Please check your Pinecone configuration and try again.")
        return

    print()
    print("=" * 70)
    print("✅ Ingestion Complete!")
    print("=" * 70)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Ingest Wise help articles into Pinecone vector database"
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Actually upload to Pinecone (default is dry-run mode)"
    )

    args = parser.parse_args()

    # Run ingestion
    asyncio.run(ingest_wise_articles(dry_run=not args.live))
