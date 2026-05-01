import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { MessagesThread } from "@/components/messages-thread";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoMessages, demoUsersList } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  if (env.isDemo) return demoUsersList.map((u) => ({ userId: u.id }));
  return [];
}

async function loadThread(ownerId: string, otherId: string) {
  if (env.isDemo) {
    return {
      other: demoUsersList.find((u) => u.id === otherId) ?? {
        id: otherId,
        name: "Demo user",
        email: "demo@example.com",
      },
      messages: demoMessages,
    };
  }
  try {
    const other = await prisma.user.findUnique({ where: { id: otherId } });
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: otherId, recipientId: null },
          { senderId: otherId, recipientId: ownerId },
          { senderId: ownerId, recipientId: otherId },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
    // Mark all messages from `other` as read
    await prisma.message.updateMany({
      where: {
        senderId: otherId,
        OR: [{ recipientId: null }, { recipientId: ownerId }],
        read: false,
      },
      data: { read: true },
    });
    return { other, messages };
  } catch {
    return { other: null, messages: [] };
  }
}

export default async function OwnerThread({
  params,
}: {
  params: { userId: string };
}) {
  const owner = await requireOwner();
  const { other, messages } = await loadThread(owner.id, params.userId);
  const initial = messages.map((m: any) => ({
    ...m,
    createdAt: typeof m.createdAt === "string" ? m.createdAt : m.createdAt.toISOString(),
  }));
  return (
    <PageShell>
      <div className="container max-w-3xl py-12 space-y-4">
        <Link href="/owner/messages" className="text-sm text-clay-mid hover:text-clay-dark">
          ← All conversations
        </Link>
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">
            {(other as any)?.name || (other as any)?.email || "User"}
          </p>
          <h1 className="font-serif text-3xl text-clay-dark mt-2">Conversation</h1>
        </div>
        <MessagesThread
          initial={initial}
          currentUserId={owner.id}
          threadWith={params.userId}
          isDemo={env.isDemo}
          endpoint={`/api/messages/${params.userId}`}
        />
      </div>
    </PageShell>
  );
}
