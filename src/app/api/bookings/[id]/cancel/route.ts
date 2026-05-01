import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendCancelled } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const booking = await prisma.booking.findFirst({
    where: { id: params.id, userId },
    include: { user: true },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cutoff = new Date(booking.startTime.getTime() - 24 * 60 * 60 * 1000);
  if (cutoff < new Date()) {
    return NextResponse.json(
      { error: "Cancellation window closed (24h before)" },
      { status: 400 }
    );
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED" },
  });

  try {
    await sendCancelled({
      userEmail: booking.user.email,
      userName: booking.user.name,
      startTime: booking.startTime,
    });
  } catch (e) {
    console.error("email cancel failed", e);
  }

  return NextResponse.json({ ok: true });
}
