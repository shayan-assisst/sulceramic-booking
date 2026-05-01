import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { sendBookingConfirmed } from "@/lib/email";
import { createCalendarEvent } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!stripe || !env.stripeWebhook) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhook);
  } catch (e: any) {
    return NextResponse.json({ error: `Bad signature: ${e.message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const cs: any = event.data.object;
    const bookingId = cs.metadata?.bookingId as string | undefined;
    if (!bookingId) return NextResponse.json({ ok: true });

    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
      include: { user: true, residency: true },
    });

    // Email confirmations
    try {
      await sendBookingConfirmed({
        userEmail: booking.user.email,
        userName: booking.user.name,
        type: booking.type as any,
        startTime: booking.startTime,
        endTime: booking.endTime,
      });
    } catch (e) {
      console.error("email confirm failed", e);
    }

    // Calendar event(s)
    try {
      const summaryBase = `Sul Ceramic — ${
        booking.type === "FIRST_SESSION" ? "First Session" : "Residency"
      } [${booking.user.name || booking.user.email}]`;
      if (booking.residency) {
        const sessions = JSON.parse(booking.residency.sessions);
        for (const s of sessions) {
          await createCalendarEvent({
            summary: summaryBase,
            description: booking.notes || "",
            startTime: new Date(s.startTime),
            endTime: new Date(s.endTime),
            attendeeEmail: booking.user.email,
          });
        }
      } else {
        await createCalendarEvent({
          summary: summaryBase,
          description: booking.notes || "",
          startTime: booking.startTime,
          endTime: booking.endTime,
          attendeeEmail: booking.user.email,
        });
      }
    } catch (e) {
      console.error("calendar create failed", e);
    }
  }

  return NextResponse.json({ ok: true });
}
