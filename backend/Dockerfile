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

ENV NODE_ENV=production
ENV PORT=3001
# API docs can be enabled at runtime with SWAGGER=true after envs are configured.
ENV SWAGGER=false

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm prune --prod

COPY --from=builder /app/dist ./dist
COPY locales ./locales
COPY prisma ./prisma
COPY public ./public
COPY swagger ./swagger
COPY templates ./templates

RUN chown -R node:node /app

USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
