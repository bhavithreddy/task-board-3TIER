# ================================================================
# Frontend Dockerfile — Multi-stage
# Stage 1: Build React with Vite (Node.js)
# Stage 2: Serve with NGINX (tiny ~25MB final image)
#
# BUG FIXED: The CMD now correctly substitutes ${BACKEND_HOST}
# in the nginx template at container startup time.
# ================================================================

# ── Stage 1: Build React ──────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Install all deps (including dev deps needed for Vite build)
RUN npm install
COPY . .
# Build produces /app/dist — static HTML/CSS/JS
RUN npm run build

# ── Stage 2: Serve with NGINX ─────────────────────────────────
FROM nginx:1.25-alpine

# gettext provides envsubst — needed to inject BACKEND_HOST
# into nginx.conf template at container startup
RUN apk add --no-cache gettext

# Remove default NGINX site config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy nginx template — uses ${BACKEND_HOST} placeholder
# envsubst will replace this at runtime
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built React app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# ── FIXED STARTUP COMMAND ─────────────────────────────────────
# envsubst replaces ${BACKEND_HOST} in the template with the
# value of the BACKEND_HOST environment variable.
#
# The single-quoted '${BACKEND_HOST}' argument tells envsubst
# ONLY to replace that specific variable — this is critical!
# Without it, envsubst would also try to replace other nginx
# variables like $host, $uri which would break the config.
#
# Flow:
#   1. envsubst reads template, replaces ${BACKEND_HOST}
#   2. Writes final config to /etc/nginx/conf.d/default.conf
#   3. NGINX starts in foreground mode (required for Docker)
CMD ["/bin/sh", "-c", \
  "envsubst '${BACKEND_HOST}' \
    < /etc/nginx/templates/default.conf.template \
    > /etc/nginx/conf.d/default.conf \
  && cat /etc/nginx/conf.d/default.conf \
  && nginx -g 'daemon off;'"]
