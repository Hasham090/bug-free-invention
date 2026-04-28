# DropFlow AI

AI-powered dropshipping automation platform. Connect Shopify stores, import products from AliExpress / CJ Dropshipping / Zendrop, auto-fulfill orders, and run budget-controlled ad campaigns — orchestrated by Claude.

## Architecture

```
dropflow-ai/
├── frontend/    Next.js 14 (App Router) — dashboard UI
├── backend/     Express API — REST + Socket.IO
├── workers/     Bull queue workers — async jobs
├── prisma/      Shared Prisma schema + migrations
├── docker-compose.yml
└── .env.example
```

- **Frontend**: Next.js 14 + React 18 + Tailwind + shadcn-style components
- **Backend**: Node.js + Express + Socket.IO + Prisma
- **DB**: PostgreSQL 16
- **Queues**: Redis 7 + Bull
- **AI**: Anthropic SDK (`claude-sonnet-4-20250514`)
- **Integrations**: Shopify Admin/Partner API, AliExpress, CJ Dropshipping, Zendrop, Facebook/Google/TikTok Ads, Playwright (generic supplier scraping)

## Quick start

```bash
# 1. clone & cd dropflow-ai
cp .env.example .env       # fill in API keys

# 2. spin up postgres + redis + apps
docker compose up --build

# 3. run migrations (first time only)
docker compose exec backend npx prisma migrate dev --name init
```

App URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Socket.IO: ws://localhost:4000

## Local dev without Docker

```bash
# install deps in each workspace
( cd backend && npm install )
( cd workers && npm install )
( cd frontend && npm install )

# generate Prisma client (runs from backend; schema lives in /prisma)
( cd backend && npx prisma generate && npx prisma migrate dev )

# start postgres + redis locally (or via docker compose up postgres redis)
( cd backend && npm run dev )
( cd workers && npm run dev )
( cd frontend && npm run dev )
```

## Modules

| # | Module | Status |
|---|--------|--------|
| 1 | Store Connections (Shopify OAuth + supplier adapters) | Implemented (live calls require credentials) |
| 2 | AI Store Builder (Claude-driven brand + copy gen) | Implemented |
| 3 | AI Product Research & Suggestions | Implemented |
| 4 | Automated Product Listing | Implemented |
| 5 | Order Fulfillment Automation | Implemented |
| 6 | Ad Campaign Manager (FB/Google/TikTok) | Implemented |
| 7 | Dashboard & Analytics | Implemented |

## Environment variables

See `.env.example`. Minimum required to boot: `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`. Other keys gate specific integrations — adapters log a warning and short-circuit when their key is absent.

## Notes on third-party APIs

- **Shopify**: OAuth callback expects a public HTTPS URL. Use `ngrok http 4000` and set `SHOPIFY_REDIRECT_URI=https://<your-ngrok>/api/shopify/callback`.
- **AliExpress**: official API access requires an approved developer account. The adapter falls back to Playwright scraping when `ALIEXPRESS_API_KEY` is unset.
- **Ads platforms**: each requires its own OAuth flow; tokens are persisted on the `AdAccount` model.

## License

MIT
