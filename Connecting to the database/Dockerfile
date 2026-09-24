# ─────────────────────────────────────────────
# Stage 1: Install dependencies (cached layer)
# ─────────────────────────────────────────────
FROM oven/bun:1.4-alpine AS deps

WORKDIR /app

# Copy only the manifest + lockfile so this layer is cached
COPY package.json bun.lock* ./

# Install with the lockfile frozen (reproducible builds).
# devDependencies ARE installed here because drizzle-kit is needed for migrations.
RUN bun install --frozen-lockfile

# ─────────────────────────────────────────────
# Stage 2: Runtime
# ─────────────────────────────────────────────
FROM oven/bun:1.4-alpine AS runtime

# Install wget for the healthcheck (alpine doesn't include it)
RUN apk add --no-cache wget

WORKDIR /app

# Non-root user for security
RUN addgroup -S app && adduser -S app -G app

# Copy installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the rest of the source code
COPY package.json bun.lock* drizzle.config.ts tsconfig.json openapi.json ./

COPY app.ts ./
COPY Utils ./Utils
COPY middlewares ./middlewares
COPY src ./src

# Own everything by the non-root user
RUN chown -R app:app /app
USER app

# Expose the API port
EXPOSE 3000

# Healthcheck — hits your /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

# Default command (docker-compose can override this for migrations)
CMD ["bun", "run", "app.ts"]