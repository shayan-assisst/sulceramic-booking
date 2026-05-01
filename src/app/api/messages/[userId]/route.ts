import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

async function ownerOnly() {
  const session = await auth();
  const user = session?.user as any;
  if (!user) return null;
  if (user.email !== env.ownerEmail) return null;
  return user as { id: string; email: string };
}

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const owner = await ownerOnly();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: params.userId, recipientId: null },
        { senderId: params.userId, recipientId: owner.id },
        { senderId: owner.id, recipientId: params.userId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
}

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  const owner = await ownerOnly();
  if (!owner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { content } = await req.json();
  const message = await prisma.message.create({
    data: {
      senderId: owner.id,
      recipientId: params.userId,
      content: String(content || "").slice(0, 4000),
    },
  });
  return NextResponse.json({
    message: { ...message, createdAt: message.createdAt.toISOString() },
  });
}
