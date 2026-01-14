# Multi-stage build for minimal production image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/public ./public
COPY --from=builder --chown=nodejs:nodejs /app/README.md ./README.md

# Create directory for vault mount point
RUN mkdir -p /vault && chown nodejs:nodejs /vault

# Switch to non-root user
USER nodejs

# Expose default port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set environment variable to indicate Docker container
ENV DOCKER_CONTAINER=true
ENV VAULT_PATH=/vault
ENV PORT=4000

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Run server directly (bypasses CLI for Docker deployment)
CMD ["node", "dist/server/index.js"]
