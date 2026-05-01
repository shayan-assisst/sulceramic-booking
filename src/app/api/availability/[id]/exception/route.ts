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

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ownerOnly()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400 });
  const existing = await prisma.availabilitySlot.findUnique({ where: { id: params.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const exceptions: string[] = existing.exceptions ? JSON.parse(existing.exceptions) : [];
  if (!exceptions.includes(date)) exceptions.push(date);
  const rule = await prisma.availabilitySlot.update({
    where: { id: params.id },
    data: { exceptions: JSON.stringify(exceptions) },
  });
  return NextResponse.json({
    rule: {
      id: rule.id,
      isRecurring: rule.isRecurring,
      recurringPattern: rule.recurringPattern ? JSON.parse(rule.recurringPattern) : null,
      startTime: rule.startTime,
      endTime: rule.endTime,
      exceptions,
    },
  });
}
