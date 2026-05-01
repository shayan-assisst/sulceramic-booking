import { google } from "googleapis";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

async function getOwnerOAuthClient() {
  const owner = await prisma.user.findUnique({ where: { email: env.ownerEmail } });
  if (!owner) {
    console.warn("[calendar] owner user not found; skipping");
    return null;
  }

  const oAuth2Client = new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret
  );

  // Prefer per-user stored refresh token; fall back to GOOGLE_REFRESH_TOKEN env
  const refresh = owner.googleRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;
  if (!refresh) {
    console.warn("[calendar] no refresh token for owner");
    return null;
  }
  oAuth2Client.setCredentials({
    refresh_token: refresh,
    access_token: owner.googleAccessToken ?? undefined,
  });
  return oAuth2Client;
}

export async function createCalendarEvent(opts: {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail?: string;
}) {
  const auth = await getOwnerOAuthClient();
  if (!auth) return null;
  const calendar = google.calendar({ version: "v3", auth });

  try {
    const res = await calendar.events.insert({
      calendarId: env.ownerCalendarId,
      sendUpdates: "all",
      requestBody: {
        summary: opts.summary,
        description: opts.description,
        start: { dateTime: opts.startTime.toISOString() },
        end: { dateTime: opts.endTime.toISOString() },
        attendees: opts.attendeeEmail ? [{ email: opts.attendeeEmail }] : undefined,
      },
    });
    return res.data.id ?? null;
  } catch (e) {
    console.error("[calendar] insert failed", e);
    return null;
  }
}
