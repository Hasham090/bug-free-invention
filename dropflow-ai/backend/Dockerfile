# build context = dropflow-ai/ (monorepo root)
FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY prisma ./prisma

RUN npx prisma generate --schema=./prisma/schema.prisma || true

EXPOSE 4000

CMD ["npm", "run", "dev"]
