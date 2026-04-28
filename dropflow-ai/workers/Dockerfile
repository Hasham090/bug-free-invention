# build context = dropflow-ai/ (monorepo root)
FROM node:20-bookworm-slim

WORKDIR /app

ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates curl \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    && rm -rf /var/lib/apt/lists/*

COPY workers/package.json workers/package-lock.json* ./
RUN npm install --no-audit --no-fund \
    && npx playwright install chromium

COPY workers/tsconfig.json ./
COPY workers/src ./src
COPY prisma ./prisma

RUN npx prisma generate --schema=./prisma/schema.prisma || true

CMD ["npm", "run", "dev"]
