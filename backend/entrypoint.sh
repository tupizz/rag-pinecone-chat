#!/bin/bash
set -e

echo "🚀 Starting Eloquent AI Chatbot Backend..."

# Wait for MongoDB to be ready
echo "⏳ Waiting for MongoDB..."
until python -c "from pymongo import MongoClient; MongoClient('${MONGODB_URL}', serverSelectionTimeoutMS=2000).admin.command('ping')" 2>/dev/null; do
  echo "MongoDB not ready yet, waiting..."
  sleep 2
done
echo "✅ MongoDB is ready!"

# Check if FAQ data needs to be ingested
if [ "$INGEST_FAQ" = "true" ]; then
  echo "📚 Ingesting FAQ data into Pinecone..."
  python /app/scripts/ingest_faq.py || echo "⚠️  FAQ ingestion failed (API keys may be invalid)"
fi

# Start the FastAPI server
echo "🎯 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 "${@}"
