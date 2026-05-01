import { Resend } from "resend";
import { env } from "@/lib/env";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

const TERRACOTTA = "#C17A4A";
const CREAM = "#F5F0E8";
const CLAY = "#3D2B1F";

function shell(title: string, body: string) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${CREAM};font-family:Georgia,serif;color:${CLAY};">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="background:#FBF8F3;border-radius:12px;padding:32px;border:1px solid #EAE0CF;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px;">
        <div style="width:32px;height:32px;border-radius:50%;background:${TERRACOTTA};color:#fff;display:inline-grid;place-items:center;font-weight:600;">S</div>
        <strong style="font-size:18px;letter-spacing:0.04em;">Sul Ceramic</strong>
      </div>
      <h1 style="font-size:24px;color:${CLAY};margin:0 0 12px;">${title}</h1>
      <div style="font-size:15px;line-height:1.6;color:${CLAY};font-family:Georgia,serif;">
        ${body}
      </div>
    </div>
    <p style="text-align:center;color:#888;font-size:12px;margin:16px 0 0;">Sul Ceramic · sulceramic.com</p>
  </div>
</body></html>`;
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.warn("[email] no Resend API key set; skipping send");
    return;
  }
  try {
    await resend.emails.send({
      from: env.resendFrom,
      to,
      subject,
      html,
    });
  } catch (e) {
    console.error("[email] failed", e);
  }
}

function formatLine(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function typeLabel(t: "BOOK_SESSIONS" | "RESIDENCY") {
  return t === "BOOK_SESSIONS" ? "Book Sessions" : "Residency";
}

export async function sendBookingConfirmed(opts: {
  userEmail: string;
  userName?: string | null;
  type: "BOOK_SESSIONS" | "RESIDENCY";
  startTime: Date;
  endTime: Date;
}) {
  const label = typeLabel(opts.type);
  const html = shell(
    "Your booking is confirmed",
    `<p>Hi ${opts.userName || "there"},</p>
     <p>Your <strong>${label}</strong> at Sul Ceramic is confirmed.</p>
     <p style="background:${CREAM};padding:12px 16px;border-radius:8px;border-left:4px solid ${TERRACOTTA};">
       <strong>${formatLine(opts.startTime)}</strong>
     </p>
     <p>You'll receive a reminder 24 hours before. We've also added the session to your Google Calendar.</p>
     <p>Looking forward to seeing you,<br/>Miguel</p>`
  );
  await send(opts.userEmail, `Sul Ceramic — ${label} confirmed`, html);
  await send(env.ownerEmail, `New booking: ${opts.userName || opts.userEmail}`, html);
}

export async function sendReminder(opts: {
  userEmail: string;
  userName?: string | null;
  type: "BOOK_SESSIONS" | "RESIDENCY";
  startTime: Date;
}) {
  const label = typeLabel(opts.type);
  const html = shell(
    "See you tomorrow",
    `<p>Hi ${opts.userName || "there"},</p>
     <p>Just a friendly reminder that your <strong>${label}</strong> is tomorrow:</p>
     <p style="background:${CREAM};padding:12px 16px;border-radius:8px;border-left:4px solid ${TERRACOTTA};">
       <strong>${formatLine(opts.startTime)}</strong>
     </p>
     <p>Wear something you don't mind getting a little muddy.</p>
     <p>— Miguel</p>`
  );
  await send(opts.userEmail, `Reminder — ${label} tomorrow`, html);
  await send(env.ownerEmail, `Reminder: ${opts.userName || opts.userEmail} tomorrow`, html);
}

export async function sendCancelled(opts: {
  userEmail: string;
  userName?: string | null;
  startTime: Date;
}) {
  const html = shell(
    "Booking cancelled",
    `<p>Hi ${opts.userName || "there"},</p>
     <p>Your booking on <strong>${formatLine(opts.startTime)}</strong> has been cancelled.</p>
     <p>If this was a mistake or you'd like to reschedule, just reply to this email or message Miguel from your dashboard.</p>`
  );
  await send(opts.userEmail, `Sul Ceramic — booking cancelled`, html);
  await send(env.ownerEmail, `Cancelled: ${opts.userName || opts.userEmail}`, html);
}

export async function sendRescheduled(opts: {
  userEmail: string;
  userName?: string | null;
  oldTime: Date;
  newTime: Date;
}) {
  const html = shell(
    "Session rescheduled",
    `<p>Hi ${opts.userName || "there"},</p>
     <p>Your residency session has been moved.</p>
     <p style="background:${CREAM};padding:12px 16px;border-radius:8px;border-left:4px solid ${TERRACOTTA};">
       Was: ${formatLine(opts.oldTime)}<br/>
       <strong>Now: ${formatLine(opts.newTime)}</strong>
     </p>`
  );
  await send(opts.userEmail, `Sul Ceramic — session rescheduled`, html);
  await send(env.ownerEmail, `Rescheduled: ${opts.userName || opts.userEmail}`, html);
}

export async function sendPaymentReminder(opts: {
  userEmail: string;
  userName?: string | null;
  sessionCount: number; // total confirmed sessions, e.g. 4 / 8 / 12
  amount: number; // cents
  payUrl: string;
}) {
  const amountEur = (opts.amount / 100).toLocaleString("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  });
  const html = shell(
    "Time to settle up",
    `<p>Hi ${opts.userName || "there"},</p>
     <p>You've reached <strong>${opts.sessionCount} confirmed sessions</strong> at Sul Ceramic — that's
        a block of 4 sessions to settle up.</p>
     <p style="background:${CREAM};padding:12px 16px;border-radius:8px;border-left:4px solid ${TERRACOTTA};">
       <strong>Amount due: ${amountEur}</strong>
     </p>
     <p>Pay securely via Stripe:</p>
     <p>
       <a href="${opts.payUrl}"
          style="display:inline-block;background:${TERRACOTTA};color:#fff;text-decoration:none;
                 padding:12px 20px;border-radius:8px;font-weight:600;">
         Pay now
       </a>
     </p>
     <p>You can also pay any time from your dashboard.</p>
     <p>— Miguel</p>`
  );
  await send(opts.userEmail, `Sul Ceramic — payment due (${amountEur})`, html);
  await send(
    env.ownerEmail,
    `Payment reminder sent: ${opts.userName || opts.userEmail} (${amountEur})`,
    html
  );
}
