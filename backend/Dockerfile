# syntax=docker/dockerfile:1.7

# Build with the backend directory as Docker context:
#   docker build -t lectum-backend ./backend

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=lectum-backend-pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS builder

# Prisma generate needs DATABASE_URL to be present, but it does not connect to the
# database during image build. Runtime must provide the real DATABASE_URL.
ARG DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lectum
ENV DATABASE_URL=${DATABASE_URL}

COPY tsconfig.json prisma.config.ts biome.json ./
COPY prisma ./prisma
COPY src ./src

RUN pnpm build

FROM base AS runner

# Build-time default used for Docker image metadata. Runtime can override PORT
# through the container environment; the API reads process.env.PORT on boot.
ARG PORT=3001

ENV NODE_ENV=production
ENV PORT=${PORT}
# API docs can be enabled at runtime with SWAGGER=true after envs are configured.
ENV SWAGGER=false

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma.config.ts ./prisma.config.ts
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm prune --prod

COPY --from=builder /app/dist ./dist
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY locales ./locales
COPY prisma ./prisma
COPY public ./public
COPY swagger ./swagger
COPY templates ./templates

RUN chmod +x ./scripts/docker-entrypoint.sh \
  && chown -R node:node /app

USER node

EXPOSE ${PORT}

CMD ["./scripts/docker-entrypoint.sh"]
