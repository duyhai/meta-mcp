# Multi-stage: build from source so deployments don't depend on a prebuilt
# dist/ being checked out alongside the Dockerfile.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --no-audit --no-fund
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist/ ./dist/
USER node
# stdio server by default; the hosted read-only endpoint overrides this with
# `node dist/http-server.js` (see the deployment's compose file).
ENTRYPOINT ["node", "dist/index.js"]
