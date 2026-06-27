# Deploy to Vercel (Multi-Store CRM)

## Overview

- **Frontend**: React (Vite) served from `frontend/dist`
- **API**: Express backend runs as a serverless function at `/api`
- **Multi-tenant**: Each **store** has its own data. Users sign in with **store slug + email + password**.

## Steps

### 1. Environment variables (Vercel project)

In Vercel → Project → Settings → Environment Variables, add:

| Name         | Value                    | Notes                    |
|--------------|--------------------------|--------------------------|
| `DATABASE`   | `mongodb+srv://...`      | MongoDB connection URI   |
| `JWT_SECRET` | long random string       | Used for auth tokens     |

Optional: `VITE_BACKEND_SERVER` – leave empty to use same origin (`/api`). Set to another URL if the API is hosted elsewhere.

### 2. Deploy

- Connect the repo to Vercel.
- Root directory: leave as repo root.
- Build and output are set in `vercel.json` (frontend build, `frontend/dist`).
- The `api/` folder is used as the serverless function; all `/api/*` requests are handled by it.

### 3. First-time data (new deployment)

The API does **not** run the setup script on Vercel. Use one of:

**Option A – Run setup locally (with same `DATABASE`)**

```bash
cd backend
npm install
# set .env with DATABASE and JWT_SECRET
npm run setup
```

This creates store `main`, admin `admin@admin.com` / `admin123`.

**Option B – Register a store from the app**

1. Open `https://your-app.vercel.app/register-store`.
2. Create a store (store name, slug, your email, password).
3. Sign in at `/login` with that store slug and email.

### 4. Existing database (before multi-tenant)

If you already had data without stores, run the migration once (e.g. locally with same `DATABASE`):

```bash
cd backend
node src/setup/migrateAddStore.js
```

This creates store `main` and assigns all existing data to it. Then sign in with store **main** and your existing email/password.

## Login flow

1. **Login**: Store slug (e.g. `main` or `acme`) + email + password.
2. **Register store**: `/register-store` creates a new store and owner account.
3. Each store’s data (clients, invoices, quotes, payments, settings, users) is isolated.

## Subscription (per store)

Stores have `subscriptionPlan` and `subscriptionStatus`. Only `active` and `trialing` stores can log in. You can later plug in Stripe or another billing provider and update these fields.

## Limits

- Serverless function timeout: 30s (configurable in `vercel.json`).
- Cold starts: first request after idle can be slower; keep MongoDB connection pooling in mind for serverless.
