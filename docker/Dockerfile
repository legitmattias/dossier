# Stage 1: Install dependencies and build
FROM node:22-slim AS builder

RUN corepack enable pnpm

WORKDIR /app

# Copy workspace config and lockfile first (layer cache)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./

# Copy package.json files for all needed packages
COPY packages/core/package.json packages/core/
COPY packages/mcp/package.json packages/mcp/

# Install all dependencies (frozen lockfile for reproducibility)
RUN CI=true pnpm install --frozen-lockfile

# Copy source code
COPY packages/core/ packages/core/
COPY packages/mcp/ packages/mcp/

# Build both packages
RUN pnpm -r run build

# Remove dev dependencies, re-install prod only (preserves workspace links)
RUN rm -rf node_modules packages/*/node_modules && \
    CI=true pnpm install --frozen-lockfile --prod

# Stage 2: Production image
FROM node:22-slim AS runtime

# Run as non-root user
RUN groupadd --system dossier && useradd --system --gid dossier dossier

WORKDIR /app

# Copy the entire pruned workspace (preserves pnpm symlinks)
COPY --from=builder /app/ ./

# Remove source files (only dist is needed at runtime)
RUN rm -rf packages/core/src packages/mcp/src tsconfig.base.json

# Create data directory for profile storage
RUN mkdir -p /data && chown dossier:dossier /data

# Default env vars
ENV DOSSIER_TRANSPORT=http
ENV DOSSIER_PORT=3100
ENV DOSSIER_HOST=0.0.0.0
ENV DOSSIER_PROFILE=/data/profile.json
ENV NODE_ENV=production

EXPOSE 3100

USER dossier

CMD ["node", "packages/mcp/dist/bin.mjs"]
