# Game server image. Build from the repository root:
#   docker build -f deploy/Dockerfile -t aegis-server .
FROM node:22-slim

ENV NODE_ENV=production \
    PORT=8787 \
    DB_PATH=/data/arena.db \
    TRUST_PROXY=1 \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app

# Workspace manifests first so the dependency layer is cached between code changes.
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/server/package.json apps/server/
COPY apps/mobile/package.json apps/mobile/
# Only the server and the shared core are installed; the mobile app is never part of this image.
RUN npm ci -w @arena/server -w @arena/core --include-workspace-root=false --ignore-scripts && npm cache clean --force

COPY tsconfig.base.json ./
COPY packages/core packages/core
COPY apps/server apps/server

RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8787)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/apps/server
CMD ["npx", "--no-install", "tsx", "src/index.ts"]
