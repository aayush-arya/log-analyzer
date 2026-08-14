FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace manifests
COPY package*.json ./
COPY engine/package*.json ./engine/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all workspace dependencies
RUN npm install --workspaces --include-workspace-root

# Copy source
COPY engine ./engine
COPY server ./server
COPY client ./client

# Build engine first, then server, then the static client bundle
RUN npm run build --workspace=engine
RUN npm run build --workspace=server
RUN npm run build --workspace=client

# ── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
COPY engine/package*.json ./engine/
COPY server/package*.json ./server/

RUN npm install --workspace=engine --workspace=server --include-workspace-root --omit=dev

COPY --from=builder /app/engine/dist ./engine/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

RUN mkdir -p /app/uploads /app/data

EXPOSE 3000
CMD ["node", "server/dist/index.js"]
