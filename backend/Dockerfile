# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Prisma 7: generate the client (src/generated/prisma/ is gitignored — must be built).
# DATABASE_URL is only read by prisma.config.ts for DB operations (migrate/deploy),
# not for generate — a dummy value is enough for code generation.
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy npx prisma generate
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
