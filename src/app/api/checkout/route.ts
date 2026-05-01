import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { generateResidencySessions } from "@/lib/availability";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json();
  const type: "FIRST_SESSION" | "RESIDENCY" = body.type;

  let startTime: Date;
  let endTime: Date;
  let residencyData: { weeklyDayOfWeek: number; weeklyTime: string; sessions: any[] } | null = null;

  if (type === "FIRST_SESSION") {
    if (!body.startTime || !body.endTime) {
      return NextResponse.json({ error: "Missing time" }, { status: 400 });
    }
    startTime = new Date(body.startTime);
    endTime = new Date(body.endTime);
  } else if (type === "RESIDENCY") {
    if (body.residencyDay === null || !body.residencyTime) {
      return NextResponse.json({ error: "Missing weekly slot" }, { status: 400 });
    }
    const now = new Date();
    const sessions = generateResidencySessions(
      Number(body.residencyDay),
      String(body.residencyTime),
      now.getMonth() + 1,
      now.getFullYear()
    );
    if (sessions.length === 0) {
      return NextResponse.json({ error: "No sessions in this month" }, { status: 400 });
    }
    startTime = new Date(sessions[0].startTime);
    endTime = new Date(sessions[0].endTime);
    residencyData = {
      weeklyDayOfWeek: Number(body.residencyDay),
      weeklyTime: String(body.residencyTime),
      sessions: sessions.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        cancelled: false,
        rescheduled: null,
      })),
    };
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const amount = type === "FIRST_SESSION" ? env.priceFirstSession : env.priceResidencyMonth;

  const booking = await prisma.booking.create({
    data: {
      userId,
      type,
      status: "PENDING",
      startTime,
      endTime,
      notes: body.notes || null,
      amountPaid: amount,
      ...(residencyData
        ? {
            residency: {
              create: {
                weeklyDayOfWeek: residencyData.weeklyDayOfWeek,
                weeklyTime: residencyData.weeklyTime,
                month: startTime.getMonth() + 1,
                year: startTime.getFullYear(),
                sessions: JSON.stringify(residencyData.sessions),
              },
            },
          }
        : {}),
    },
  });

  if (!stripe) {
    // Fallback for local dev without Stripe: auto-confirm
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    });
    return NextResponse.json({ url: `${env.appUrl}/dashboard/booking/${booking.id}?demo=1` });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name:
              type === "FIRST_SESSION"
                ? "Sul Ceramic — First Session"
                : "Sul Ceramic — Residency (1 month)",
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${env.appUrl}/dashboard/booking/${booking.id}?success=1`,
    cancel_url: `${env.appUrl}/book?cancelled=1`,
    metadata: { bookingId: booking.id },
    customer_email: session.user!.email!,
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripePaymentId: checkout.id },
  });

  return NextResponse.json({ url: checkout.url });
}
