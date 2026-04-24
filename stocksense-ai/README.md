# StockSense AI

**Dead Inventory Intelligence for e-commerce sellers.** Connect a store → AI analyzes every SKU → you get one specific action per product (discount, bundle, liquidate, reorder pause, or promote).

Built with Next.js 14 App Router, Tailwind, shadcn/ui, Prisma + Postgres, OpenAI GPT-4o, Clerk, Stripe, Shopify, Amazon SP-API.

---

## Run it in 60 seconds (demo mode)

```bash
cd stocksense-ai
cp .env.example .env.local          # leave it blank for demo
npm install
npm run dev
```

Open <http://localhost:3000>.

Demo mode uses **in-memory data** (50 seeded products across 5 categories with pre-generated AI recommendations). Every page works — landing, onboarding, dashboard, inventory, AI action center, forecast, reports, settings. No external services required.

---

## Production setup

### 1. Configure env vars

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose | Get from |
|---|---|---|
| `DATABASE_URL` | Postgres | [Railway](https://railway.app), [Neon](https://neon.tech), [Supabase](https://supabase.com) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Auth | [Clerk](https://clerk.com) |
| `OPENAI_API_KEY` | AI recommendations | [OpenAI](https://platform.openai.com) |
| `STRIPE_SECRET_KEY`, price IDs, `STRIPE_WEBHOOK_SECRET` | Billing | [Stripe](https://dashboard.stripe.com) |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | Store integration | [Shopify Partner](https://partners.shopify.com) |

### 2. Migrate the database

```bash
npx prisma migrate dev --name init
npm run db:seed                     # seeds 1 user, 1 store, 50 products, sales history, recommendations
```

### 3. Create Stripe products

In your Stripe dashboard create three recurring prices:

- **Starter** — $49/mo → paste the `price_...` ID into `STRIPE_PRICE_STARTER`
- **Growth** — $149/mo → `STRIPE_PRICE_GROWTH`
- **Enterprise** — $499/mo → `STRIPE_PRICE_ENTERPRISE`

Point a webhook endpoint at `/api/webhooks/stripe` listening for:

- `checkout.session.completed`
- `customer.subscription.{created,updated,deleted}`
- `invoice.payment_failed`

Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.

### 4. Create a Shopify app

In Shopify Partner dashboard:

- App URL: `https://your-domain.com`
- Allowed redirect URL: `https://your-domain.com/api/shopify/callback`
- Scopes: `read_products,read_orders,read_inventory`

Copy the API key/secret into `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET`.

### 5. Deploy

**Recommended: Vercel (frontend) + Railway (Postgres).**

- Push the repo to GitHub
- Import into Vercel, add all env vars
- Add Postgres on Railway, paste its connection string into `DATABASE_URL`
- Run `npx prisma migrate deploy && npm run db:seed` from a Vercel deploy hook or Railway shell

---

## Project structure

```
stocksense-ai/
├── prisma/
│   ├── schema.prisma            # User, Store, Product, SaleRecord, AIRecommendation, Subscription
│   └── seed.ts                  # 50-product demo seed
├── src/
│   ├── app/
│   │   ├── page.tsx             # Landing (/)
│   │   ├── sign-in/             # Clerk sign-in (falls back to demo panel)
│   │   ├── sign-up/
│   │   ├── onboarding/          # 4-step setup flow
│   │   ├── dashboard/
│   │   │   ├── layout.tsx       # Sidebar shell
│   │   │   ├── page.tsx         # Overview w/ gauge + top-5 + AI feed
│   │   │   ├── inventory/       # Searchable, sortable, exportable table
│   │   │   ├── actions/         # AI Action Center (core feature)
│   │   │   ├── forecast/        # 30/60/90 velocity + stockouts + risk
│   │   │   ├── reports/         # 12-month history + PDF export
│   │   │   └── settings/        # Account, stores, notifications, billing
│   │   └── api/
│   │       ├── ai/recommend/            # Generate a rec for one product
│   │       ├── recommendations/         # List + PATCH status
│   │       ├── onboarding/              # Store preferences
│   │       ├── stripe/checkout/         # Create subscription session
│   │       ├── stripe/portal/           # Billing portal
│   │       ├── webhooks/stripe/         # Subscription lifecycle
│   │       ├── shopify/connect/         # OAuth kickoff
│   │       └── shopify/callback/        # OAuth exchange
│   ├── components/
│   │   ├── ui/                          # shadcn primitives
│   │   ├── landing/
│   │   └── dashboard/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── openai.ts                    # GPT-4o w/ structured JSON
│   │   ├── stripe.ts                    # Plan definitions
│   │   ├── data.ts                      # In-memory demo layer
│   │   ├── seed-data.ts                 # 50 products shared by seed + demo
│   │   ├── forecast.ts                  # Velocity + risk scoring
│   │   ├── auth.ts                      # Clerk config detection
│   │   ├── types.ts
│   │   └── utils.ts
│   └── middleware.ts                    # Clerk route protection
```

## How the AI works

For every dead/slow SKU, `src/lib/openai.ts` sends the product's context to GPT-4o with this system prompt:

> You are StockSense AI, a dead-inventory decision engine for e-commerce sellers. Your job: given a single product's data, return ONE specific action the seller should take. Never just describe data. Always recommend a decision. Return valid JSON with actionType, explanation, expectedOutcome, confidenceScore, dollarImpact.

Responses are constrained via `response_format: { type: "json_object" }` and parsed into typed action cards. If the API key is missing, `openai.ts` falls back to a deterministic rule-based engine that generates the same shape.

## Commands

```bash
npm run dev                    # start dev server
npm run build                  # production build
npm run lint
npm run db:generate            # regenerate Prisma client
npm run db:migrate             # run migrations
npm run db:seed                # seed demo data
```

## License

MIT.
