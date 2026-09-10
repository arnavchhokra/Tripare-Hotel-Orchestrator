# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:18-bullseye-slim AS builder

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package*.json ./
RUN npm ci

# Copy source and compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN cp -r src/data dist/data

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM node:18-bullseye-slim

WORKDIR /app

# Only copy what is needed at runtime
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose the Express port
EXPOSE 3000

# Default command starts the API server.
# The worker container overrides this via docker-compose `command`.
CMD ["node", "dist/server.js"]
