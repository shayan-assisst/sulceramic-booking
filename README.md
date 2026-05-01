# Sul Ceramic — Booking

A booking and scheduling web app for **Sul Ceramic**, a ceramics studio in the south of Portugal.
Single-session bookings, monthly residencies, owner availability calendar, Stripe payments,
Google Calendar sync, Resend email reminders, and a built-in messaging thread between studio and
client.

> Live demo (read-only, mock data): https://shayan-assisst.github.io/sulceramic-booking

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** + custom shadcn-style components
- **Prisma + SQLite** (`./prisma/dev.db`)
- **NextAuth v5 (beta)** — Google sign-in with Calendar scope
- **Stripe** Checkout + webhook
- **Google Calendar API** (events sync)
- **Resend** (transactional email)
- **Vercel-style cron** for daily reminders (configurable for any cron host)

## Features

### For clients
- One-tap Google sign-in
- Two formats:
  - **First Session** — single 2h intro at the wheel
  - **Residency** — 4 sessions/month at a recurring weekly time, reschedule individual
    sessions up to 24h before
- Stripe-powered checkout
- Booking detail page with cancellation (24h cutoff)
- Direct messaging with the studio

### For Miguel (owner)
- Today / week / unread overview
- Availability editor — set recurring weekly windows, block specific dates, see a 4-week preview
- Full booking list with paid status
- Conversation inbox grouped per client
- Auto Calendar invites on every confirmed booking (each residency session becomes its own event)

---

## Setup

### Prerequisites

- Node 20+
- A Google Cloud project
- A Stripe account
- A Resend account (or any provider; this just uses Resend's HTTP API)

### 1. Clone & install

```bash
git clone https://github.com/shayan-assisst/sulceramic-booking.git
cd sulceramic-booking
npm install
cp .env.example .env
```

### 2. Google OAuth (with Calendar)

1. Open https://console.cloud.google.com/apis/credentials
2. **Create credentials → OAuth client ID → Web application**
3. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   (and your production URL once deployed)
4. Under **APIs & Services → Library**, enable:
   - **Google Calendar API**
5. Under **OAuth consent screen → Scopes**, ensure these scopes are listed:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/calendar`
6. Copy the **Client ID** and **Client Secret** into `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

The first time **Miguel** signs in, his Google access + refresh tokens are stored on his User
record. The Calendar sync uses *his* tokens to write events to his calendar (`OWNER_CALENDAR_ID`).

### 3. Stripe

1. Create a Stripe account at https://dashboard.stripe.com/
2. Get your **Secret key** and **Publishable key** from the Developers tab.
3. Set them in `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Set prices (in cents) — these default to 50 EUR / 160 EUR:
   ```
   PRICE_FIRST_SESSION=5000
   PRICE_RESIDENCY_MONTH=16000
   ```
5. Set up the webhook:
   - **Local dev**: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
     The CLI will print a `whsec_...` signing secret — paste it as `STRIPE_WEBHOOK_SECRET`.
   - **Production**: in the Stripe dashboard, add an endpoint at
     `https://yourdomain.com/api/stripe/webhook` listening to `checkout.session.completed`.
     Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

### 4. Resend (email)

1. Create a free account at https://resend.com/
2. Verify your sending domain (e.g. `bookings@sulceramic.com`).
3. Create an API key and set:
   ```
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=bookings@sulceramic.com
   ```

### 5. Owner detection

The user with email `OWNER_EMAIL` is automatically promoted to `OWNER` on sign-in and gets the
studio dashboard at `/owner`. Set this to Miguel's Google email:
```
OWNER_EMAIL=miguel@sulceramic.com
```

### 6. Cron for reminders

Reminders run via a request to `GET /api/cron/reminders` with header
`Authorization: Bearer <CRON_SECRET>`. Set `CRON_SECRET` to a random string.

The included `vercel.json` runs this daily at 08:00 UTC. If you self-host, schedule a curl
similarly via cron, GitHub Actions, or your platform's scheduler.

### 7. Initialize the database

```bash
npx prisma db push
```

### 8. Run

```bash
npm run dev
# → http://localhost:3000
```

---

## Deployment (self-hosted)

### Option A — PM2

```bash
npm run build
npx pm2 start "npm start" --name sulceramic
npx pm2 save
```

Front it with nginx/Caddy and a TLS cert.

### Option B — Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Persist the SQLite file by mounting `prisma/dev.db` as a volume — or switch the Prisma datasource
to Postgres for multi-replica setups.

### Stripe webhook in production
Add the webhook URL in your Stripe dashboard and copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

### Cron in production
Use either a platform-native cron, GitHub Actions on a schedule, or a managed cron service to hit
`/api/cron/reminders`. Auth is the `CRON_SECRET` Bearer token.

---

## Demo mode (GitHub Pages)

This repo can build a static-export "demo" deploy where:

- Auth is bypassed (a fake user is signed in)
- Database is replaced by mock data in `src/lib/demo-data.ts`
- All write actions show a toast: *"Demo mode — sign in to book for real"*
- You can flip between the user dashboard and the owner area from the nav

To build it locally:

```bash
NEXT_PUBLIC_DEMO_MODE=true npm run build
# → output in ./out
```

The included GitHub Action `.github/workflows/demo.yml` builds and deploys this static export
to the `gh-pages` branch on every push to `main`.

---

## Project layout

```
src/
  app/
    page.tsx                    landing
    book/page.tsx               3-step booking flow
    signin/page.tsx
    dashboard/                  client area
    owner/                      studio area
    api/                        route handlers (auth, checkout, webhook, cron, …)
  components/
    booking-flow.tsx            multi-step picker
    availability-editor.tsx     owner calendar editor
    messages-thread.tsx         polling chat UI
    site-nav.tsx
    ui/                         button, card, input, …
  lib/
    auth-helpers.ts             getCurrentUser / requireUser / requireOwner
    availability.ts             slot generation + residency math
    calendar.ts                 Google Calendar event creation
    email.ts                    Resend templates
    prisma.ts                   client singleton
    stripe.ts                   client singleton
prisma/schema.prisma            full data model
```

---

## License

UNLICENSED — built for Miguel @ Sul Ceramic.
