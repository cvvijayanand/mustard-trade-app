# Deploy mustard-trade-app to Vercel

## Prerequisites

- [Vercel account](https://vercel.com) connected to your Git repo
- [Neon](https://neon.tech) or **Vercel Postgres** for sessions (SQLite does not work on Vercel)
- App configured in [Dev Dashboard](https://dev.shopify.com/dashboard)

## 1. Create a PostgreSQL database

**Option A — Vercel Postgres**

1. Vercel project → **Storage** → **Create Database** → Postgres
2. Connect it to the project; `DATABASE_URL` is added automatically

**Option B — Neon (free tier)**

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the **pooled** connection string (`?sslmode=require`)
3. Use the same URL for local `.env` dev if you like

Run migrations once (from your machine):

```bash
DATABASE_URL="your-postgres-url" npx prisma migrate deploy
```

## 2. Deploy on Vercel

1. **Import** this repo in Vercel (New Project → Import Git Repository)
2. Framework preset: **React Router** (auto-detected with `react-router.config.js`)
3. **Environment variables** (Settings → Environment Variables):


| Variable             | Value                                                          |
| -------------------- | -------------------------------------------------------------- |
| `SHOPIFY_API_KEY`    | Dev Dashboard → app → Settings → Client ID                     |
| `SHOPIFY_API_SECRET` | Dev Dashboard → Client secret                                  |
| `SCOPES`             | Same as `shopify.app.toml` scopes (comma-separated)            |
| `SHOPIFY_APP_URL`    | `https://YOUR-PROJECT.vercel.app` until custom domain is ready |
| `DATABASE_URL`       | Postgres connection string (pooled URL for Neon)               |
| `NODE_ENV`           | `production`                                                   |


1. Deploy. Build runs: `prisma generate` → `prisma migrate deploy` → `react-router build`

Copy your deployment URL, e.g. `https://mustard-trade-app.vercel.app`.

## 3. Update Shopify (Dev Dashboard)

**Versions** → **Create a version** → set:

- **App URL:** `https://YOUR-PROJECT.vercel.app` (or custom domain below)
- **Redirect URL:** `https://YOUR-PROJECT.vercel.app/auth/callback`
- **App proxy URL:** `https://YOUR-PROJECT.vercel.app/apps/trade-order`

**Release** the version, then **Install app** on your store and open it once in Admin.

Update local `shopify.app.toml` to match, or keep using `shopify app dev` for local work.

## 4. Custom domain `trade-app.mustardliving.com`

1. Vercel → Project → **Settings** → **Domains** → Add `trade-app.mustardliving.com`
2. Add the DNS record Vercel shows (usually **CNAME** `trade-app` → `cname.vercel-dns.com`)
3. After SSL is active, set `SHOPIFY_APP_URL=https://trade-app.mustardliving.com` in Vercel env and redeploy
4. Release a new Dev Dashboard version with the same URLs

## 5. Verify

```bash
curl -I https://YOUR-PROJECT.vercel.app/app
# Expect redirect or 200, not 404

curl -I https://www.mustardliving.com/apps/trade-order/create
# After app is installed — should not be a bare storefront 404
```

## Local development

Use Postgres locally (recommended) or keep a separate dev DB:

```bash
cp .env.example .env
# Fill DATABASE_URL, SHOPIFY_* 
shopify app dev
```

`shopify app dev` still uses a tunnel; production uses Vercel + the URLs in Dev Dashboard.