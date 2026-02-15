# SnipyClubVip Betting Analytics Engine (Next.js + Vercel + Prisma)

Betting Analytics Engine with:
- Odds snapshots
- Public vs Cash snapshots
- Internal model probabilities
- Decision engine (`NO_BET`, `LEAN`, `VALUE`, `STRONG_VALUE`, `TRAP_WARNING`)
- Historical storage for backtesting

## Stack
- Next.js App Router + TypeScript
- Prisma + PostgreSQL (Supabase/Neon)
- Vercel Route Handlers (`app/api/**/route.ts`)

## Main Endpoints
- `GET /api/matches?league=&date=YYYY-MM-DD`
- `GET /api/match/[id]`
- `POST /api/analyze`
- `POST /api/sync` (protected by `X-CRON-SECRET`)
- `GET /api/sync` (Vercel cron compatible via `x-vercel-cron`)

## Decision Engine (MVP)
Implemented in `lib/analytics/engine.ts`:
- Implied prob + fair odds
- Edge
- SharpScore™
- Market Pressure Index
- Trap Risk
- Verdict + 3-6 reasons

## Local Setup
1. Install dependencies
```bash
npm install
```
2. Configure env
```bash
cp .env.example .env.local
# Fill DATABASE_URL + CRON_SECRET
```
3. Prisma generate/migrate
```bash
npm run prisma:generate
npm run prisma:migrate
```
4. Run app
```bash
npm run dev
```

## Trigger Sync Manually
```bash
curl -X POST http://localhost:3000/api/sync?limit=30 \
  -H "X-CRON-SECRET: YOUR_SECRET"
```

## Vercel Deployment
Set env vars in Vercel Project Settings:
- `DATABASE_URL`
- `CRON_SECRET`
- optional provider keys

Then deploy normally. `vercel.json` contains cron:
```json
{
  "crons": [
    { "path": "/api/sync", "schedule": "*/10 * * * *" }
  ]
}
```

## Notes
- Sync is batched (`limit`, `cursor`) to avoid long function execution.
- Snapshot history is append-only (no overwrite), ready for backtesting.
- If Public/Cash missing: `SharpMoneySignal` fallback is neutral (`0`).
