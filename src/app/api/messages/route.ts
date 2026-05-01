import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ messages: [] }, { status: 401 });
  const owner = await prisma.user.findUnique({ where: { email: env.ownerEmail } });
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, recipientId: owner?.id ?? null },
        { senderId: owner?.id ?? "", recipientId: userId },
        { senderId: userId, recipientId: null },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({
    messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { content } = await req.json();
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }
  const owner = await prisma.user.findUnique({ where: { email: env.ownerEmail } });
  const message = await prisma.message.create({
    data: {
      senderId: userId,
      recipientId: owner?.id ?? null,
      content: content.slice(0, 4000),
    },
  });
  return NextResponse.json({
    message: { ...message, createdAt: message.createdAt.toISOString() },
  });
}
