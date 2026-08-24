FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache wget \
    && mkdir -p /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d \
    && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx /etc/nginx/conf.d \
    && sed -i '/^user /d' /etc/nginx/nginx.conf \
    && sed -i 's|pid .*|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf

COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html
COPY --chown=nginx:nginx nginx.conf /etc/nginx/templates/default.conf.template

ENV BACKEND_HOST=backend:5000
ENV PORT=8080

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/nginx-health >/dev/null || exit 1

CMD ["/bin/sh", "-c", "BACKEND_HOST=${BACKEND_HOST:-backend:5000} envsubst '${BACKEND_HOST}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
