import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json();
  const reminderId = body.reminderId as string | undefined;
  if (!reminderId) {
    return NextResponse.json({ error: "Missing reminderId" }, { status: 400 });
  }

  const reminder = await prisma.paymentReminder.findFirst({
    where: { id: reminderId, userId, paid: false },
  });
  if (!reminder) {
    return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
  }

  if (!stripe) {
    // Local dev fallback: mark paid immediately.
    await prisma.paymentReminder.update({
      where: { id: reminder.id },
      data: { paid: true, paidAt: new Date() },
    });
    return NextResponse.json({ url: `${env.appUrl}/dashboard?paid=1` });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `Sul Ceramic — Sessions ${reminder.sessionFrom}–${reminder.sessionTo}`,
          },
          unit_amount: reminder.amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${env.appUrl}/dashboard?paid=1`,
    cancel_url: `${env.appUrl}/dashboard?cancelled=1`,
    metadata: { reminderId: reminder.id, kind: "PAYMENT_REMINDER" },
    customer_email: session!.user!.email!,
  });

  await prisma.paymentReminder.update({
    where: { id: reminder.id },
    data: { stripePaymentId: checkout.id },
  });

  return NextResponse.json({ url: checkout.url });
}
