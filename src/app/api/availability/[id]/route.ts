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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await ownerOnly()))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.availabilitySlot.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
