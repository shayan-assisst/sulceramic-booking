import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { sendReminder } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${env.cronSecret}`;
  if (!env.cronSecret || auth !== expected) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      startTime: { gte: in24h, lt: in48h },
    },
    include: { user: true },
  });

  let sent = 0;
  for (const b of bookings) {
    try {
      await sendReminder({
        userEmail: b.user.email,
        userName: b.user.name,
        type: b.type as any,
        startTime: b.startTime,
      });
      sent += 1;
    } catch (e) {
      console.error("reminder failed", e);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
