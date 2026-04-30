# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Enable pnpm via corepack (version locked in package.json)
RUN corepack enable

WORKDIR /app

# Copy manifest + lockfile for dependency caching
COPY package.json pnpm-lock.yaml ./

# Copy scripts needed by postinstall (patch-epic-ui.mjs)
COPY scripts/ ./scripts/

# Copy local vendor package (epic-ui .tgz)
COPY vendor/ ./vendor/

# Install dependencies (runs postinstall automatically)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# VITE_API_URL is baked in at build time.
# Set it via --build-arg or docker-compose build.args.
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# ─── Stage 2: Serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# SPA routing config
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/ | grep -q '<html' || exit 1

CMD ["nginx", "-g", "daemon off;"]
