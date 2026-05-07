# Sul Ceramic — Booking

A booking and scheduling web app for **Sul Ceramic**, a ceramics studio in the south of Portugal.
Flexible session bookings (with deferred payment after every 4 sessions), monthly residencies
with upfront payment, owner availability calendar, Stripe payments, Google Calendar sync,
Resend email reminders, and a built-in messaging thread between studio and client.

> Live demo (read-only, mock data): https://ibeezhan.github.io/sulceramic-booking

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
  - **Book Sessions** — pick one or more individual slots, or set a recurring weekly schedule
    (e.g. every Monday at 18:00). No upfront payment — billed every 4 confirmed sessions.
  - **Residency** — pick the days you want to come, choose 1 or 2 sessions per week, set a
    start date. The first month is generated and paid upfront.
- Stripe-powered checkout (residency upfront, sessions deferred via reminder)
- Booking detail page with cancellation (24h cutoff)
- Payment reminder banner on the dashboard with one-click "Pay now"
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
git clone https://github.com/ibeezhan/sulceramic-booking.git
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
4. Set prices (in cents) — defaults to 50 EUR/session for ad-hoc, 40 EUR/session for residency:
   ```
   PRICE_PER_SESSION=5000          # billed every 4 sessions for "Book Sessions"
   PRICE_RESIDENCY_SESSION=4000    # billed upfront monthly for residency
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

## Booking Model

Two formats sit side-by-side and use different payment models:

### Book Sessions — deferred payment

- The user picks one or more sessions, either by tapping individual slots in a multi-select
  calendar, or by defining a recurring pattern (e.g. *every Monday at 18:00, 4 times*).
- All picked sessions are created as `BOOK_SESSIONS` bookings with status `CONFIRMED` and
  **no upfront payment** — `amountPaid` is null.
- The user record carries a `confirmedSessionCount` counter that increments each time a session
  is confirmed.
- After every 4th confirmed session (cumulative), the daily cron at `/api/cron/reminders`
  creates a `PaymentReminder` row covering the block (`sessionFrom..sessionTo`) for
  `4 × PRICE_PER_SESSION` and emails both the user and the owner.
- The user dashboard shows a **payment reminder banner** with a *Pay now* button that opens
  Stripe Checkout. On `checkout.session.completed`, the webhook flips the reminder to `paid`.

### Residency — upfront payment

- The user picks day(s) of week (Mon–Sun toggle), 1 or 2 sessions per week, a start date, and
  a time. The system generates the individual session dates for the first month from that
  pattern.
- Total price = `sessions_in_month × PRICE_RESIDENCY_SESSION`.
- The booking is created `PENDING`. Stripe Checkout collects the first month upfront. On
  `checkout.session.completed`, the webhook flips the booking to `CONFIRMED` and writes one
  Google Calendar event per generated session.

The `PaymentReminder` model:

```prisma
model PaymentReminder {
  id              String    @id @default(cuid())
  userId          String
  sessionFrom     Int
  sessionTo       Int
  amount          Int       // cents
  stripePaymentId String?
  paid            Boolean   @default(false)
  sentAt          DateTime  @default(now())
  paidAt          DateTime?
  user            User      @relation(...)
}
```

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

A ready-to-use workflow lives at `docs/demo-workflow.yml`. To enable auto-deploy on every push to
`main`, copy it into `.github/workflows/`:

```bash
mkdir -p .github/workflows
cp docs/demo-workflow.yml .github/workflows/demo.yml
git add .github/workflows/demo.yml && git commit -m "ci: add gh-pages workflow" && git push
```

(The initial demo deploy was published manually to the `gh-pages` branch — the workflow keeps
it in sync afterwards.)

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
