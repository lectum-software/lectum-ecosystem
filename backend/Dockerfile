# syntax=docker/dockerfile:1.7

# Build with the backend directory as Docker context:
#   docker build -t lectum-backend ./backend

# Keep the tested security patch/digest aligned with package.json (ADR-0648).
FROM node:24.22.1-bookworm-slim@sha256:be8204d4bd327363357f532187b752ff62759c31bedf98e9e18fc08c9cbd605c AS base

ENV PNPM_HOME=/pnpm
ENV COREPACK_HOME=/corepack
ENV PATH=${PNPM_HOME}:${PATH}
ENV COREPACK_DEFAULT_TO_LATEST=0

WORKDIR /app

RUN corepack enable \
  && corepack prepare pnpm@10.33.0 --activate \
  && chmod -R a+rX "${COREPACK_HOME}"

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
# O typecheck também cobre testes que importam os catálogos reais de tradução.
# Manter os mesmos recursos na compilação isolada e na imagem final.
COPY locales ./locales

RUN pnpm build

FROM deps AS production-deps

# Prune before copying into the final image: deleting files in a later runner
# layer would retain the original development dependencies in its lower layer.
RUN pnpm prune --prod

FROM base AS runner

# Build-time default used for Docker image metadata. Runtime can override PORT
# through the container environment; the API reads process.env.PORT on boot.
ARG PORT=3001

ENV NODE_ENV=production
ENV PORT=${PORT}
ENV COREPACK_ENABLE_NETWORK=0
# API docs remain disabled in every published runtime. Generate/inspect them locally.
ENV SWAGGER=false

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && chown node:node /app \
  && install -d -o node -g node /app/scripts

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=node:node prisma.config.ts ./prisma.config.ts
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --chown=node:node --chmod=755 scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
COPY --chown=node:node locales ./locales
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node public ./public
COPY --chown=node:node templates ./templates

USER node

# Prova no build que o usuário não privilegiado encontra o pnpm já embarcado,
# sem depender de download ou mutação do container em runtime.
RUN pnpm --version

# Exercise real loopback transport in the final runtime, never a financial provider.
# Fail rather than silently accepting a runtime without outbound body observation.
RUN node -e 'const [major, minor] = (process.versions.undici || "0.0").split(".").map(Number); if (!(major > 7 || (major === 7 && minor >= 11))) process.exit(1)' \
  && node --test dist/modules/billing/payment-gateway/outbound-transport.test.js

EXPOSE ${PORT}

CMD ["./scripts/docker-entrypoint.sh"]
