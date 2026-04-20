FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodeuser -u 1001
WORKDIR /app
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules
COPY --chown=nodeuser:nodejs src/ ./src/
COPY --chown=nodeuser:nodejs package*.json ./
USER nodeuser
EXPOSE 5000
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]
