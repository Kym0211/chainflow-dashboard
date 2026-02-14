# Chainflow Solana Validator Dashboard

A Next.js dashboard for monitoring Chainflow's Solana validator income and performance.

## Features

- **Income Tracking**: Revenue breakdown (block rewards, MEV, priority fees, commission) vs costs (vote fees)
- **Performance Monitoring**: TVC credits, skip rate, APY, slot duration, JIP-25 ranking
- **Comparison**: Side-by-side with top performer and network averages
- **CSV Upload**: Import income reports from JPool and Staking.kiwi
- **Automated Data**: Cron jobs pull from Trillium API every 6 hours

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Charts**: Recharts
- **Styling**: Tailwind CSS
- **Data Fetching**: TanStack Query
- **Deployment**: Vercel

## Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url>
cd chainflow-dashboard
npm install
```

### 2. Set up the database

1. Create a free [Neon](https://neon.tech) PostgreSQL database
2. Copy the connection string

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/chainflow?sslmode=require
CHAINFLOW_PUBKEY=CAf8jfgqhia5VNrEF4A7Y9VLD3numMq9DVSceq7cPhNY
CRON_SECRET=your-random-secret-here
```

### 4. Push database schema

```bash
npm run db:push
```

### 5. Run development server

```bash
npm run dev
```

### 6. Seed initial data

Trigger the cron jobs manually to populate the database:

```bash
# Fetch Chainflow data from Trillium
curl -H "Authorization: Bearer your-random-secret-here" http://localhost:3000/api/cron/fetch-trillium

# Fetch benchmark data (top performer + network averages)
curl -H "Authorization: Bearer your-random-secret-here" http://localhost:3000/api/cron/fetch-benchmarks

# Fetch SOL price
curl -H "Authorization: Bearer your-random-secret-here" http://localhost:3000/api/cron/fetch-sol-price
```

Then open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy — cron jobs are configured in `vercel.json` and run automatically

## Data Sources

| Source | Type | Method |
|--------|------|--------|
| [Trillium API](https://api.trillium.so) | Performance, APY, MEV, skip rate, TVC | Automated (cron) |
| [JPool](https://app.jpool.one) | Income reports | CSV upload |
| [Staking.kiwi](https://staking.kiwi) | Income reports | CSV upload |
| CoinGecko | SOL price | Automated (cron) |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/validators/chainflow` | Chainflow data + benchmarks |
| `GET /api/income` | Income reports from CSV uploads |
| `POST /api/income` | Upload parsed CSV income data |
| `GET /api/epochs` | Network-level epoch data |
| `GET /api/cron/fetch-trillium` | Cron: pull Trillium data |
| `GET /api/cron/fetch-benchmarks` | Cron: pull comparison data |
| `GET /api/cron/fetch-sol-price` | Cron: pull SOL price |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cron/            # Automated data fetching
│   │   ├── validators/      # Validator data API
│   │   ├── income/          # Income report API
│   │   └── epochs/          # Epoch data proxy
│   ├── dashboard/
│   │   └── page.tsx         # Main dashboard page
│   └── layout.tsx
├── components/
│   ├── dashboard/           # Tab components
│   │   ├── overview-tab.tsx
│   │   ├── income-tab.tsx
│   │   ├── performance-tab.tsx
│   │   ├── comparison-tab.tsx
│   │   ├── metric-card.tsx
│   │   └── csv-upload.tsx
│   └── providers.tsx
├── hooks/                   # React Query hooks
├── lib/
│   ├── db/                  # Drizzle schema + connection
│   ├── trillium/            # API client + types
│   ├── constants.ts
│   └── utils.ts
```
