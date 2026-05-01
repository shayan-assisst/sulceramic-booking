import { PageShell } from "@/components/page-shell";
import { MessagesThread } from "@/components/messages-thread";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoMessages } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

async function loadMessages(userId: string) {
  if (env.isDemo) return demoMessages;
  try {
    const owner = await prisma.user.findUnique({ where: { email: env.ownerEmail } });
    const ownerId = owner?.id ?? null;
    return await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: ownerId },
          { senderId: ownerId ?? "", recipientId: userId },
          { senderId: userId, recipientId: null },
        ],
      },
      orderBy: { createdAt: "asc" },
    });
  } catch {
    return [];
  }
}

export default async function MessagesPage() {
  const user = await requireUser();
  const initial = (await loadMessages(user.id)).map((m: any) => ({
    ...m,
    createdAt: typeof m.createdAt === "string" ? m.createdAt : m.createdAt.toISOString(),
  }));
  return (
    <PageShell>
      <div className="container max-w-3xl py-12 space-y-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">Messages</p>
          <h1 className="font-serif text-4xl text-clay-dark mt-2">Talk to the studio</h1>
        </div>
        <MessagesThread
          initial={initial}
          currentUserId={user.id}
          isDemo={env.isDemo}
          endpoint="/api/messages"
        />
      </div>
    </PageShell>
  );
}
