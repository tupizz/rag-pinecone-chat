# Eloquent AI Chatbot - RAG-Powered Customer Support

A full-stack AI-powered chatbot application with Retrieval-Augmented Generation (RAG) for answering fintech customer support questions. Built with FastAPI, Next.js, OpenAI, Pinecone, and MongoDB.

## Architecture Overview

- **Backend**: FastAPI (Python) with async support
- **Frontend**: Next.js 14 (TypeScript) with App Router
- **Database**: MongoDB for chat history and user sessions
- **Vector Database**: Pinecone for FAQ knowledge base
- **AI Model**: OpenAI GPT-5 with RAG for accurate responses
- **Authentication**: JWT-based auth with anonymous user support
- **Deployment**: AWS ECS/Fargate with Infrastructure as Code (CDK)

## Features

✅ **RAG-Powered Responses** - Retrieves relevant FAQ context before generating answers
✅ **Session Persistence** - Chat history saved for both anonymous and authenticated users
✅ **Anonymous Users** - Start chatting immediately without signup
✅ **User Authentication** - Register and login to access chat history across devices
✅ **Streaming Responses** - Real-time AI response streaming for better UX
✅ **Multi-Category FAQs** - Organized knowledge base across 5 fintech categories
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
│   ├── Dockerfile             # Multi-stage Docker build
│   └── test_api.py            # API tests
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/               # Next.js app router
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom React hooks
│   │   └── lib/               # API client, utilities
│   ├── package.json
│   └── Dockerfile
├── infrastructure/             # AWS CDK (TypeScript)
│   ├── lib/
│   │   ├── network-stack.ts   # VPC, subnets, security groups
│   │   ├── database-stack.ts  # DocumentDB cluster
│   │   ├── compute-stack.ts   # ECS/Fargate, ALB
│   │   └── frontend-stack.ts  # S3, CloudFront, Route 53
│   └── bin/app.ts
├── data/                       # FAQ knowledge base
│   └── faq.json               # 30+ fintech FAQs
├── scripts/
│   └── ingest_faq.py          # Pinecone ingestion script
├── docker-compose.yml          # Local development environment
└── README.md
```

## Prerequisites

- **Python 3.11+** with [uv](https://github.com/astral-sh/uv) package manager
- **Node.js 18+** and npm/yarn
- **Docker** and Docker Compose
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
- **Pinecone API Key** - [Sign up here](https://www.pinecone.io/)

## Quick Start

### 1. Clone and Setup Environment

```bash
git clone <your-repo>
cd eloquent-ai-chatbot

# Copy environment template
cp .env.example backend/.env

# Edit backend/.env and add your API keys:
# - OPENAI_API_KEY
# - PINECONE_API_KEY
# - PINECONE_ENVIRONMENT (e.g., us-east-1)
```

### 2. Backend Setup (with uv)

```bash
cd backend

# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create virtual environment and install dependencies
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .

# Verify installation
python test_api.py
```

### 3. Start MongoDB

```bash
# From project root
docker compose up -d mongodb

# Verify MongoDB is running
docker ps | grep mongo
```

### 4. Ingest FAQ Data into Pinecone

```bash
cd backend
source .venv/bin/activate
python ../scripts/ingest_faq.py
```

Expected output:

```
🚀 Starting FAQ ingestion process...
📊 Initializing Pinecone index...
📖 Loading FAQ data from data/faq.json...
✅ Loaded 30 FAQ items
⬆️  Uploading documents to Pinecone...
✅ Ingestion complete!
```

### 5. Start the Backend Server

```bash
cd backend
source .venv/bin/activate
python -m uvicorn app.main:app --reload

# Server will start at http://localhost:8000
# API docs available at http://localhost:8000/docs
```

### 6. Frontend Setup (Coming Next)

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
- `GET /api/chat/sessions` - List all sessions
- `GET /api/chat/sessions/{session_id}/messages` - Get session messages
- `DELETE /api/chat/sessions/{session_id}` - Delete session

## Testing the Backend

### Manual API Testing with curl

```bash
# Health check
curl http://localhost:8000/health

# Create a chat session and send a message
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I create an account?"}'

# Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword123",
    "full_name": "John Doe"
  }'
```

### Running Tests

```bash
cd backend
source .venv/bin/activate
python test_api.py
```

## Environment Variables

### Backend (.env)

| Variable               | Description        | Example                     |
| ---------------------- | ------------------ | --------------------------- |
| `OPENAI_API_KEY`       | OpenAI API key     | `sk-...`                    |
| `OPENAI_MODEL`         | Model to use       | `gpt-5-chat-latest`         |
| `PINECONE_API_KEY`     | Pinecone API key   | `...`                       |
| `PINECONE_ENVIRONMENT` | Pinecone region    | `us-east-1`                 |
| `PINECONE_INDEX_NAME`  | Index name         | `eloquent-faq-index`        |
| `MONGODB_URL`          | MongoDB connection | `mongodb://localhost:27017` |
| `JWT_SECRET_KEY`       | JWT signing key    | Min 32 characters           |
| `ALLOWED_ORIGINS_STR`  | CORS origins       | `http://localhost:3000`     |

### Frontend (.env.local)

| Variable              | Description     | Example                     |
| --------------------- | --------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8000/api` |

## Docker Deployment

### Development

```bash
# Start all services (MongoDB + Backend + Frontend)
docker compose up -d

# View logs
docker compose logs -f backend

# Stop all services
docker compose down
```

### Production Build

```bash
# Build production backend image
cd backend
docker build -t eloquent-backend:latest --target production .

# Build production frontend image
cd frontend
docker build -t eloquent-frontend:latest --target production .
```

## AWS Deployment (CDK)

Full AWS deployment guide coming soon. The infrastructure includes:

- **Network**: VPC with public/private subnets across 2 AZs
- **Database**: DocumentDB cluster (MongoDB-compatible)
- **Compute**: ECS Fargate cluster with auto-scaling
- **Load Balancer**: ALB with SSL/TLS termination
- **Frontend**: S3 + CloudFront CDN
- **Secrets**: AWS Secrets Manager for API keys
- **Monitoring**: CloudWatch Logs and Alarms

## How RAG Works

1. **User sends a question** → "How do I reset my password?"
2. **Embedding generation** → OpenAI creates vector embedding of the question
3. **Vector search** → Pinecone finds top 5 most similar FAQ entries
4. **Context retrieval** → Relevant FAQ text is extracted
5. **Prompt construction** → Question + Context sent to GPT-5
6. **Response generation** → AI generates accurate, context-aware answer
7. **Source attribution** → Response includes FAQ source references

This prevents hallucinations and ensures answers are grounded in your knowledge base!

## Development Workflow

### Adding New FAQs

1. Edit `data/faq.json` and add new entries
2. Run the ingestion script:
   ```bash
   python scripts/ingest_faq.py
   ```
3. Test with relevant questions

### Backend Development

```bash
cd backend
source .venv/bin/activate

# Install new dependency
uv pip install <package>

# Run with auto-reload
uvicorn app.main:app --reload

# Format code
black app/
```

### Frontend Development

```bash
cd frontend

# Install new dependency
npm install <package>

# Run dev server
npm run dev

# Type checking
npm run type-check

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
- Ensure index exists: run `python scripts/ingest_faq.py`

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

## Contact & Support

For questions about this technical assignment, please reach out to the Eloquent AI team.

---

Built with ❤️ for Eloquent AI Technical Assignment
