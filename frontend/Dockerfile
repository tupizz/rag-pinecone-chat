# Multi-stage build for Next.js frontend

# ------------------------------
# Stage 1: Base image with Node.js
# ------------------------------
FROM node:20-alpine AS base

# Install dependencies only when needed
WORKDIR /app

# ------------------------------
# Stage 2: Dependencies stage
# ------------------------------
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# ------------------------------
# Stage 3: Development image
# ------------------------------
FROM base AS development

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Set environment to development
ENV NODE_ENV=development

# Start development server
CMD ["npm", "run", "dev"]

# ------------------------------
# Stage 4: Builder stage for production
# ------------------------------
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build the application
RUN npm run build

# ------------------------------
# Stage 5: Production image
# ------------------------------
FROM base AS production

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start production server
CMD ["node", "server.js"]

