// Centralised env access with sensible fallbacks for local/demo dev.
export const env = {
  isDemo: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ownerEmail: process.env.OWNER_EMAIL ?? "miguel@sulceramic.com",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM_EMAIL ?? "bookings@sulceramic.com",
  stripeSecret: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishable: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
  priceFirstSession: parseInt(process.env.PRICE_FIRST_SESSION ?? "5000", 10),
  priceResidencyMonth: parseInt(process.env.PRICE_RESIDENCY_MONTH ?? "16000", 10),
  ownerCalendarId: process.env.OWNER_CALENDAR_ID ?? "primary",
  cronSecret: process.env.CRON_SECRET ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
};
