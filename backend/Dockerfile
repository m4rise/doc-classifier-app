# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# ── Stage 2: runner ───────────────────────────────────────────────────────────
# Distroless: no shell, no package manager, no npm — eliminates the entire
# /usr/local/lib/node_modules/npm vulnerability surface.
# nonroot (uid 65532) is built-in to the distroless image.
FROM gcr.io/distroless/nodejs24-debian13 AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER nonroot
EXPOSE 3000

# Entrypoint is already "node" in distroless — just pass the script path.
CMD ["dist/main.js"]
