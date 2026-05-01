import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { generateResidencySessionsFromPattern } from "@/lib/availability";
import { sendBookingConfirmed } from "@/lib/email";

export const dynamic = "force-dynamic";

type SessionInput = { startTime: string; endTime: string };

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json();
  const type: "BOOK_SESSIONS" | "RESIDENCY" = body.type;

  if (type === "BOOK_SESSIONS") {
    const sessions: SessionInput[] = Array.isArray(body.sessions) ? body.sessions : [];
    if (sessions.length === 0) {
      return NextResponse.json({ error: "Pick at least one session" }, { status: 400 });
    }
    const recurringPattern = body.recurringPattern
      ? JSON.stringify(body.recurringPattern)
      : null;

    // Create one Booking row per session, all confirmed (deferred payment).
    const created = [];
    for (const s of sessions) {
      const startTime = new Date(s.startTime);
      const endTime = new Date(s.endTime);
      const b = await prisma.booking.create({
        data: {
          userId,
          type: "BOOK_SESSIONS",
          status: "CONFIRMED",
          startTime,
          endTime,
          notes: body.notes || null,
          recurringPattern,
          sessionCount: 1,
        },
      });
      created.push(b);
    }

    // Bump the user's confirmed-session counter.
    await prisma.user.update({
      where: { id: userId },
      data: { confirmedSessionCount: { increment: sessions.length } },
    });

    // Fire confirmation email (best-effort).
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        for (const b of created) {
          await sendBookingConfirmed({
            userEmail: user.email,
            userName: user.name,
            type: "BOOK_SESSIONS",
            startTime: b.startTime,
            endTime: b.endTime,
          });
        }
      }
    } catch (e) {
      console.error("[checkout] email confirm failed", e);
    }

    // Redirect target: dashboard list.
    return NextResponse.json({ url: `${env.appUrl}/dashboard/bookings?confirmed=1` });
  }

  if (type === "RESIDENCY") {
    const r = body.residency;
    if (!r || !Array.isArray(r.daysOfWeek) || r.daysOfWeek.length === 0) {
      return NextResponse.json({ error: "Missing residency config" }, { status: 400 });
    }
    const startDate = new Date(r.startDate);
    const generated = generateResidencySessionsFromPattern({
      daysOfWeek: r.daysOfWeek.map((n: any) => Number(n)),
      time: String(r.time || "18:00"),
      sessionsPerWeek: Number(r.sessionsPerWeek) === 2 ? 2 : 1,
      startDate,
    });
    if (generated.length === 0) {
      return NextResponse.json({ error: "No sessions could be generated" }, { status: 400 });
    }
    const sessionsPerMonth = generated.length;
    const firstStart = new Date(generated[0].startTime);
    const firstEnd = new Date(generated[0].endTime);

    const booking = await prisma.booking.create({
      data: {
        userId,
        type: "RESIDENCY",
        status: "CONFIRMED",
        startTime: firstStart,
        endTime: firstEnd,
        notes: body.notes || null,
        sessionCount: sessionsPerMonth,
        residency: {
          create: {
            daysOfWeek: JSON.stringify(r.daysOfWeek),
            sessionsPerMonth,
            startDate,
            sessions: JSON.stringify(
              generated.map((s) => ({
                date: s.date,
                startTime: s.startTime,
                endTime: s.endTime,
                cancelled: false,
                rescheduled: null,
              }))
            ),
          },
        },
      },
    });

    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await sendBookingConfirmed({
          userEmail: user.email,
          userName: user.name,
          type: "RESIDENCY",
          startTime: firstStart,
          endTime: firstEnd,
        });
      }
    } catch (e) {
      console.error("[checkout] residency confirm email failed", e);
    }

    return NextResponse.json({
      url: `${env.appUrl}/dashboard/booking/${booking.id}?confirmed=1`,
    });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}
