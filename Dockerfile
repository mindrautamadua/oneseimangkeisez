# Container image for OneSeiMangkeiSEZ (hosting-agnostic; target environment must be approved by KINRA).
# Build:   docker build -t onekinra:<version> .
# Migrate: docker build --target migrate -t onekinra-migrate:<version> . && docker run --rm -e DATABASE_URL=... onekinra-migrate:<version>
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# One-shot job that applies versioned SQL migrations.
FROM deps AS migrate
COPY drizzle ./drizzle
COPY scripts ./scripts
COPY src/lib/db ./src/lib/db
CMD ["pnpm", "-s", "tsx", "scripts/migrate.ts"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/api/live || exit 1
CMD ["node", "server.js"]
