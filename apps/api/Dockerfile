FROM node:20-bullseye-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
RUN npm ci --workspace apps/api

COPY apps/api/tsconfig.json apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/api/src apps/api/src

RUN npm -w apps/api run prisma:generate
RUN npm -w apps/api run build
RUN npm prune --omit=dev --workspace apps/api

FROM node:20-bullseye-slim AS runtime
WORKDIR /app/apps/api
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/prisma /app/apps/api/prisma
COPY --from=build /app/apps/api/package.json /app/apps/api/package.json

EXPOSE 4000
CMD ["node", "dist/server.js"]
