# Build stage
FROM oven/bun:1 AS builder

WORKDIR /app

# Accept NUXT_PUBLIC_API_URL as a build-arg with a sensible default so
# `bun run build` can access it during image build (required by nuxt.config)
ARG NUXT_PUBLIC_API_URL=https://api.blichstudio.com
ENV NUXT_PUBLIC_API_URL=${NUXT_PUBLIC_API_URL}

# Copy package files
COPY package.json bun.lock* ./

# Install system build dependencies required for native modules
# (node-gyp / better-sqlite3 need Python and build tools)
# Make installation tolerant: support Debian (`apt-get`) or Alpine (`apk`).
RUN set -eux; \
    if command -v apt-get >/dev/null 2>&1; then \
        export DEBIAN_FRONTEND=noninteractive; \
        apt-get update; \
        apt-get install -y --no-install-recommends \
            python3 python3-dev build-essential make g++ ca-certificates; \
        # Ensure `python` points to python3 for node-gyp
        if [ ! -e /usr/bin/python ] && [ -e /usr/bin/python3 ]; then ln -s /usr/bin/python3 /usr/bin/python; fi; \
        rm -rf /var/lib/apt/lists/*; \
    elif command -v apk >/dev/null 2>&1; then \
        apk add --no-cache python3 python3-dev build-base make g++; \
    else \
        echo "No supported package manager found (apt-get or apk); continuing without installing build deps"; \
    fi

# Install JavaScript dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the Nuxt application
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS runner

WORKDIR /app

# Create non-root user for security (install user/group utilities if missing)
RUN set -eux; \
    if command -v apt-get >/dev/null 2>&1; then \
        export DEBIAN_FRONTEND=noninteractive; \
        apt-get update; \
        apt-get install -y --no-install-recommends adduser; \
        rm -rf /var/lib/apt/lists/*; \
    elif command -v apk >/dev/null 2>&1; then \
        # shadow provides useradd/groupadd on Alpine
        apk add --no-cache shadow busybox; \
    else \
        echo "No known package manager found; skipping user install"; \
    fi; \
    # Prefer addgroup/adduser if available, otherwise fall back to groupadd/useradd
    if command -v addgroup >/dev/null 2>&1 && command -v adduser >/dev/null 2>&1; then \
        addgroup --system --gid 1001 nuxt || true; \
        adduser --system --uid 1001 --gid 1001 nuxt || true; \
    elif command -v groupadd >/dev/null 2>&1 && command -v useradd >/dev/null 2>&1; then \
        groupadd -g 1001 nuxt || true; \
        useradd -u 1001 -g 1001 -M -r -s /sbin/nologin nuxt || true; \
    else \
        echo "Warning: could not create nuxt user (no adduser/groupadd available)"; \
    fi

# Copy built application from builder
COPY --from=builder --chown=nuxt:nuxt /app/.output /app/.output

# Switch to non-root user
USER nuxt

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Start the application
CMD ["bun", ".output/server/index.mjs"]
