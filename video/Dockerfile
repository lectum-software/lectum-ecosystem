# syntax=docker/dockerfile:1.7

# Build with video/ as context:
#   docker build -t lectum-video ./video

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

FROM base AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=lectum-video-pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS builder

COPY tsconfig.json biome.json ./
COPY src ./src
RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg fonts-dejavu-core tini \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /var/lib/lectum-video \
  && chown -R node:node /var/lib/lectum-video /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm prune --prod
COPY --from=builder /app/dist ./dist

USER node
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "--enable-source-maps", "dist/api.js"]
