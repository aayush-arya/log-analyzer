FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package*.json ./
COPY engine/package*.json ./engine/
COPY server/package*.json ./server/

# Install all workspace dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY engine ./engine
COPY server ./server

# Build engine first, then server
RUN npm run build --workspace=engine
RUN npm run build --workspace=server

# ── Production image ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
COPY engine/package*.json ./engine/
COPY server/package*.json ./server/

RUN npm install --workspaces --include-workspace-root --omit=dev

COPY --from=builder /app/engine/dist ./engine/dist
COPY --from=builder /app/server/dist ./server/dist

RUN mkdir -p /app/uploads

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
