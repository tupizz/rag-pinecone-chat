# Multi-stage build for Python FastAPI backend using uv

# ------------------------------
#  Stage 1: Base image with uv
# ------------------------------
FROM python:3.11-slim AS base

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set working directory
WORKDIR /app

# Set Python environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_SYSTEM_PYTHON=1

# ------------------------------
# Stage 2: Build stage - install dependencies
# ------------------------------
FROM base AS builder

# Copy dependency files
COPY backend/pyproject.toml backend/requirements.txt* ./

# Install dependencies using uv
RUN uv pip install --system --no-cache -r pyproject.toml

# ------------------------------
# Stage 3: Development image
# ------------------------------
FROM builder AS development

# Copy application code
COPY backend/app ./app
COPY backend/entrypoint.sh ./entrypoint.sh
COPY data ./data
COPY scripts ./scripts

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

# Expose port
EXPOSE 8000

# Use entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
CMD ["--reload"]

# ------------------------------
# Stage 4: Production image
# ------------------------------
FROM base AS production

# Install curl for health checks (as root before switching users)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY backend/app ./app
COPY backend/entrypoint.sh ./entrypoint.sh
COPY data ./data
COPY scripts ./scripts

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check (using curl for better reliability)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use entrypoint script
ENTRYPOINT ["./entrypoint.sh"]
CMD []
