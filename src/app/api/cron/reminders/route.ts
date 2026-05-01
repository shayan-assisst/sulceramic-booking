import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import {
  sendReminder,
  sendPaymentReminder,
  sendResidencyPaymentReminder,
} from "@/lib/email";
import { generateResidencySessionsFromPattern } from "@/lib/availability";

export const dynamic = "force-dynamic";

type ResidencySession = {
  date: string;
  startTime: string;
  endTime: string;
  cancelled?: boolean;
  rescheduled?: string | null;
};

// Encode a calendar month (the month being billed) into a single int so we
// can stuff it into the existing PaymentReminder.sessionFrom column without a
// schema explosion. Format: year*100 + (month+1), e.g. 2026-06 -> 202606.
function monthKey(year: number, month0: number) {
  return year * 100 + (month0 + 1);
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret}`;
  if (!env.cronSecret || auth !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // 1. Day-before reminders.
  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      startTime: { gte: in24h, lt: in48h },
    },
    include: { user: true },
  });

  let sentReminders = 0;
  for (const b of bookings) {
    try {
      await sendReminder({
        userEmail: b.user.email,
        userName: b.user.name,
        type: b.type as any,
        startTime: b.startTime,
      });
      sentReminders += 1;
    } catch (e) {
      console.error("reminder failed", e);
    }
  }

  // 2. Book Sessions payment reminders: any user whose confirmedSessionCount
  //    is a non-zero multiple of 4, and who has no PaymentReminder yet for
  //    that block.
  const users = await prisma.user.findMany({
    where: { confirmedSessionCount: { gt: 0 } },
    include: { paymentReminders: true },
  });

  let sentPaymentReminders = 0;
  for (const user of users) {
    const completedBlocks = Math.floor(user.confirmedSessionCount / 4);
    if (completedBlocks === 0) continue;

    for (let block = 1; block <= completedBlocks; block++) {
      const sessionFrom = (block - 1) * 4 + 1;
      const sessionTo = block * 4;
      const exists = user.paymentReminders.find(
        (r) =>
          r.bookingType === "BOOK_SESSIONS" &&
          r.sessionFrom === sessionFrom &&
          r.sessionTo === sessionTo
      );
      if (exists) continue;

      const amount = env.pricePerSession * 4;
      await prisma.paymentReminder.create({
        data: {
          userId: user.id,
          bookingType: "BOOK_SESSIONS",
          sessionFrom,
          sessionTo,
          amount,
        },
      });
      try {
        await sendPaymentReminder({
          userEmail: user.email,
          userName: user.name,
          sessionCount: sessionTo,
          amount,
          payUrl: `${env.appUrl}/dashboard`,
        });
        sentPaymentReminders += 1;
      } catch (e) {
        console.error("payment reminder email failed", e);
      }
    }
  }

  // 3. Residency payment reminders: for each active residency, check whether
  //    the user has completed >=4 sessions in the current calendar month.
  //    If so, send the reminder for next month (and persist a PaymentReminder
  //    row keyed by next-month so we never double-send).
  const residencies = await prisma.residencyBooking.findMany({
    include: { booking: { include: { user: true } } },
  });

  let sentResidencyReminders = 0;
  for (const r of residencies) {
    const booking = r.booking;
    if (!booking || booking.status === "CANCELLED") continue;

    let sessions: ResidencySession[] = [];
    try {
      sessions = JSON.parse(r.sessions);
    } catch {
      continue;
    }
    if (!Array.isArray(sessions) || sessions.length === 0) continue;

    const completedThisMonth = sessions.filter((s) => {
      if (s.cancelled) return false;
      const when = new Date(s.rescheduled || s.startTime);
      return (
        when <= now &&
        when.getFullYear() === now.getFullYear() &&
        when.getMonth() === now.getMonth()
      );
    }).length;

    if (completedThisMonth < 4) continue;

    const nextMonth0 = (now.getMonth() + 1) % 12;
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    const key = monthKey(nextYear, nextMonth0);

    const existing = await prisma.paymentReminder.findFirst({
      where: {
        userId: booking.userId,
        bookingType: "RESIDENCY",
        sessionFrom: key,
      },
    });
    if (existing) continue;

    // Project next month's sessions from the residency pattern.
    const daysOfWeek: number[] = JSON.parse(r.daysOfWeek);
    const sessionsPerWeek = r.sessionsPerMonth >= 8 ? 2 : 1;
    const firstSession = sessions[0];
    const time = firstSession
      ? new Date(firstSession.startTime).toTimeString().slice(0, 5)
      : "18:00";
    const nextStart = new Date(nextYear, nextMonth0, 1);
    const nextSessions = generateResidencySessionsFromPattern({
      daysOfWeek,
      time,
      sessionsPerWeek,
      startDate: nextStart,
    });
    const sessionCount = nextSessions.length || r.sessionsPerMonth;
    const amount = sessionCount * env.priceResidencySession;

    await prisma.paymentReminder.create({
      data: {
        userId: booking.userId,
        bookingType: "RESIDENCY",
        sessionFrom: key,
        sessionTo: sessionCount,
        amount,
      },
    });
    try {
      await sendResidencyPaymentReminder({
        userEmail: booking.user.email,
        userName: booking.user.name,
        monthLabel: nextStart.toLocaleString("en-GB", {
          month: "long",
          year: "numeric",
        }),
        sessions: nextSessions.map((s) => ({
          startTime: new Date(s.startTime),
          endTime: new Date(s.endTime),
        })),
        sessionCount,
        amount,
        payUrl: `${env.appUrl}/dashboard`,
      });
      sentResidencyReminders += 1;
    } catch (e) {
      console.error("residency payment reminder email failed", e);
    }
  }

  return NextResponse.json({
    ok: true,
    sentReminders,
    sentPaymentReminders,
    sentResidencyReminders,
  });
}
