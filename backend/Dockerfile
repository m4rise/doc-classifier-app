# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Prisma 7: generate the TypeScript client from schema (src/generated/prisma/ is gitignored).
# prisma generate does not connect to the database — it only reads schema.prisma to emit
# TypeScript types. ARG provides the DATABASE_URL required by prisma.config.ts at build time
# without embedding real credentials in the image layer.
ARG DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy
RUN npx prisma generate
RUN npm run build && npm prune --omit=dev

# ── Stage 2: runner ───────────────────────────────────────────────────────────
# Distroless: no shell, no package manager, no npm — eliminates the entire
# /usr/local/lib/node_modules/npm vulnerability surface.
# nonroot (uid 65532) is built-in to the distroless image.
FROM gcr.io/distroless/nodejs24-debian13 AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated/prisma ./src/generated/prisma

USER nonroot
EXPOSE 3000

# Entrypoint is already "node" in distroless — just pass the script path.
CMD ["dist/main.js"]
