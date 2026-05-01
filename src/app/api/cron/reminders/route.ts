import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { sendReminder, sendPaymentReminder } from "@/lib/email";

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

  // 2. Payment reminder check: any user whose confirmedSessionCount is a non-zero
  //    multiple of 4, and who has no PaymentReminder yet for that block.
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
        (r) => r.sessionFrom === sessionFrom && r.sessionTo === sessionTo
      );
      if (exists) continue;

      const amount = env.pricePerSession * 4;
      await prisma.paymentReminder.create({
        data: {
          userId: user.id,
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

  return NextResponse.json({
    ok: true,
    sentReminders,
    sentPaymentReminders,
  });
}
