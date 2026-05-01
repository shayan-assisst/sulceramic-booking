import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

async function ownerOnly() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.email !== env.ownerEmail) return null;
  return user;
}

export async function POST(req: NextRequest) {
  if (!(await ownerOnly()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const rule = await prisma.availabilitySlot.create({
    data: {
      isRecurring: !!body.isRecurring,
      recurringPattern: body.recurringPattern ? JSON.stringify(body.recurringPattern) : null,
      startTime: body.startTime ? new Date(body.startTime) : null,
      endTime: body.endTime ? new Date(body.endTime) : null,
      exceptions: JSON.stringify([]),
    },
  });
  return NextResponse.json({
    rule: {
      id: rule.id,
      isRecurring: rule.isRecurring,
      recurringPattern: rule.recurringPattern ? JSON.parse(rule.recurringPattern) : null,
      startTime: rule.startTime,
      endTime: rule.endTime,
      exceptions: [],
    },
  });
}
