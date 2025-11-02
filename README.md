# Eloquent AI Chatbot - RAG-Powered Customer Support

A full-stack AI-powered chatbot application with Retrieval-Augmented Generation (RAG) for answering fintech customer support questions. Built with FastAPI, Next.js, OpenAI, Pinecone, and MongoDB.

version: 1.0.0

## Architecture Overview

- **Backend**: FastAPI (Python) with async support
- **Frontend**: Next.js 16 (TypeScript) with App Router and React 19
- **Database**: MongoDB (local development) / MongoDB Atlas (production)
- **Vector Database**: Pinecone for knowledge base storage
- **AI Model**: OpenAI GPT-5 with RAG for accurate responses
- **Authentication**: JWT-based auth with anonymous user support
- **Deployment**: AWS ECS/Fargate with Infrastructure as Code (CDK)

## Features

✅ **RAG-Powered Responses** - Retrieves relevant context from knowledge base before generating answers  
✅ **Session Persistence** - Chat history saved for both anonymous and authenticated users  
✅ **Anonymous Users** - Start chatting immediately without signup  
✅ **User Authentication** - Register and login to access chat history across devices  
✅ **Streaming Responses** - Real-time AI response streaming for better UX  
✅ **Knowledge Base Management** - Browse and search documents in Pinecone (authenticated users)  
✅ **Production Ready** - Docker containers, health checks, and AWS deployment

## Project Structure

```
eloquent-ai-chatbot/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # API endpoints (chat, auth)
│   │   ├── core/              # Config and security
│   │   ├── models/            # Pydantic data models
│   │   ├── services/          # RAG, embeddings, vector search
│   │   └── db/                # MongoDB connection
│   ├── pyproject.toml         # Python dependencies (uv)
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # Multi-stage Docker build
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # Next.js app router
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom React hooks
│   │   └── lib/               # API client, utilities
│   └── package.json
├── infrastructure/             # AWS CDK (TypeScript)
│   ├── lib/stacks/
│   │   ├── vpc-stack.ts       # VPC, subnets, security groups
│   │   ├── ecs-stack.ts       # ECS/Fargate, ALB, auto-scaling
│   │   ├── ecr-stack.ts       # Container registry
│   │   ├── secrets-stack.ts   # Secrets Manager
│   │   └── dns-stack.ts       # Route 53, SSL certificates
│   └── bin/app.ts
├── data/                       # Knowledge base
│   ├── wise_help_articles.json       # Wise help articles (part 1)
│   └── wise_help_articles_part2.json # Wise help articles (part 2)
├── backend/scripts/
│   └── ingest_wise_articles.py # Pinecone ingestion script
├── docker-compose.yml          # Local development environment
└── README.md
```

## Prerequisites

- **Python 3.11+** with [uv](https://github.com/astral-sh/uv) package manager
- **Node.js 20+** and npm/yarn
- **Docker** and Docker Compose
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
- **Pinecone API Key** - [Sign up here](https://www.pinecone.io/)

## Quick Start

### 1. Clone and Setup Environment

```bash
git clone <your-repo>
cd eloquent-ai-chatbot

# Copy environment templates
cp backend/copy.env backend/.env
cp frontend/copy.env.local frontend/.env.local

# Edit backend/.env and add your API keys:
# - OPENAI_API_KEY
# - PINECONE_API_KEY
# - PINECONE_ENVIRONMENT (e.g., us-east-1)
# - PINECONE_INDEX_NAME
# - JWT_SECRET_KEY (min 32 characters)
```

### 2. Backend Setup (with uv)

```bash
cd backend

# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -r requirements.txt
```

### 3. Start MongoDB

```bash
# From project root
docker compose up -d mongodb

# Verify MongoDB is running
docker ps | grep mongo
```

### 4. Ingest Knowledge Base into Pinecone

```bash
cd backend
source .venv/bin/activate

# Dry run (validates files without uploading)
python scripts/ingest_wise_articles.py

# Actual upload to Pinecone
python scripts/ingest_wise_articles.py --live
```

The script will:

- Load articles from `data/wise_help_articles.json` and `data/wise_help_articles_part2.json`
- Validate document structure
- Generate embeddings and upload to Pinecone
- Display statistics about the uploaded knowledge base

### 5. Start the Backend Server

```bash
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload

# Server will start at http://localhost:8000
# API docs available at http://localhost:8000/docs
```

### 6. Frontend Setup

```bash
cd frontend
npm install
npm run dev

# Frontend will start at http://localhost:3000
```

## API Endpoints

### Health & Info

- `GET /` - Welcome message
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/promote-anonymous` - Convert anonymous session to user account

### Chat

- `POST /api/chat` - Send message and get AI response
- `POST /api/chat/stream` - Send message with streaming response
- `GET /api/chat/sessions` - List all sessions for current user
- `GET /api/chat/sessions/{session_id}/messages` - Get session messages with pagination
- `DELETE /api/chat/sessions/{session_id}` - Delete session

### Documents (Authenticated)

- `GET /api/documents` - List documents in knowledge base
- `GET /api/documents/stats` - Get Pinecone index statistics

### Admin (Authenticated)

- `GET /api/admin/documents` - Get index overview
- `GET /api/admin/documents/search-all` - Search documents with generic queries
- `GET /api/admin/documents/stats` - Get detailed index statistics
- `POST /api/admin/documents/test-search` - Test search with custom query

## Testing the Backend

### Manual API Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Create a chat session and send a message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I send money internationally?"}'

# Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "full_name": "John Doe"
  }'

# Login and get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123"
  }'
```

## Environment Variables

### Backend (.env)

| Variable               | Description        | Example                                |
| ---------------------- | ------------------ | -------------------------------------- |
| `OPENAI_API_KEY`       | OpenAI API key     | `sk-...`                               |
| `OPENAI_MODEL`         | Model to use       | `gpt-5-chat-latest`                    |
| `PINECONE_API_KEY`     | Pinecone API key   | `...`                                  |
| `PINECONE_ENVIRONMENT` | Pinecone region    | `us-east-1`                            |
| `PINECONE_INDEX_NAME`  | Index name         | `ai-powered-chatbot-challenge-omkb0qe` |
| `MONGODB_URL`          | MongoDB connection | `mongodb://localhost:27017`            |
| `JWT_SECRET_KEY`       | JWT signing key    | Min 32 characters                      |
| `ALLOWED_ORIGINS_STR`  | CORS origins       | `http://localhost:3000`                |

### Frontend (.env.local)

| Variable              | Description     | Example                     |
| --------------------- | --------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000/api` |

## Docker Deployment

### Development

```bash
# Start all services (MongoDB + Backend)
# Note: Frontend is not included in docker-compose, run separately with npm
docker compose up -d

# View logs
docker compose logs -f backend

# Stop all services
docker compose down
```

### Production Build

```bash
# Build production backend image (from project root)
docker build -f backend/Dockerfile -t eloquent-backend:latest --target production .
```

**Note**: Frontend doesn't have a Dockerfile. For production, deploy to Vercel or build with `npm run build`.

## AWS Deployment (CDK)

The infrastructure code is located in the `infrastructure/` directory. See `infrastructure/CDK_DEPLOYMENT.md` for detailed deployment instructions.

The deployment includes:

- **Network (VPC Stack)**: VPC with public/private subnets across 2 AZs
- **Container Registry (ECR Stack)**: ECR repository for Docker images
- **Secrets (Secrets Stack)**: AWS Secrets Manager for API keys and credentials
- **Compute (ECS Stack)**:
  - ECS Fargate cluster with auto-scaling (1-4 tasks)
  - Application Load Balancer with health checks
  - CloudWatch Logs and Alarms
  - Auto-scaling based on CPU/memory utilization
- **DNS (DNS Stack)**: Route 53 and ACM SSL certificates
- **Database**: MongoDB Atlas (managed externally, connection string in Secrets Manager)

**Note**: The frontend is deployed separately (not included in CDK infrastructure)

## How RAG Works

1. **User sends a question** → "How do I send money internationally?"
2. **Embedding generation** → OpenAI creates vector embedding of the question (text-embedding-ada-002)
3. **Vector search** → Pinecone finds top 3 most similar articles (similarity threshold: 0.75)
4. **Context retrieval** → Relevant article text is extracted
5. **Prompt construction** → Question + Context + Conversation History sent to GPT-5
6. **Response generation** → AI generates accurate, context-aware answer
7. **Source attribution** → Response includes source references with metadata

This prevents hallucinations and ensures answers are grounded in your knowledge base!

## Development Workflow

### Adding New Articles to Knowledge Base

1. Add new articles to `data/wise_help_articles.json` or create a new JSON file
2. Follow the document structure:
   ```json
   {
     "documents": [
       {
         "id": "unique-id",
         "text": "Full article text for embedding",
         "metadata": {
           "category": "Category Name",
           "question": "Article question/title",
           "answer": "Full answer text",
           "source": "Source URL or identifier"
         }
       }
     ]
   }
   ```
3. Run the ingestion script:
   ```bash
   cd backend
   python scripts/ingest_wise_articles.py --live
   ```
4. Test with relevant questions in the chat interface

### Backend Development

```bash
cd backend
source .venv/bin/activate

# Install new dependency
uv pip install <package>

# Run with auto-reload
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend

# Install new dependency
npm install <package>

# Run dev server
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB
docker compose restart mongodb

# View MongoDB logs
docker compose logs mongodb
```

### Pinecone Connection Issues

- Verify your `PINECONE_API_KEY` is correct
- Check `PINECONE_ENVIRONMENT` matches your Pinecone dashboard
- Ensure index exists: run `python backend/scripts/ingest_wise_articles.py --live`

### OpenAI API Issues

- Verify your `OPENAI_API_KEY` is valid
- Check your OpenAI account has credits
- Ensure you have access to the model specified in `.env`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
