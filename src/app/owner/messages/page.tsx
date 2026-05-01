import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoUsersList } from "@/lib/demo-data";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadThreads(ownerId: string) {
  if (env.isDemo) {
    return demoUsersList.map((u) => ({
      userId: u.id,
      name: u.name,
      email: u.email,
      unread: u.unread,
      lastMessage: "Hi Miguel, looking forward to the session!",
      lastAt: new Date().toISOString(),
    }));
  }
  try {
    // Find all distinct users who have exchanged messages with the studio
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ recipientId: null }, { recipientId: ownerId }, { senderId: ownerId }],
      },
      orderBy: { createdAt: "desc" },
      include: { sender: true, recipient: true },
      take: 200,
    });
    const byUser = new Map<
      string,
      { userId: string; name: string | null; email: string | null; unread: number; lastMessage: string; lastAt: string }
    >();
    for (const m of messages) {
      const otherId =
        m.senderId === ownerId ? m.recipientId : m.senderId;
      if (!otherId || otherId === ownerId) continue;
      if (!byUser.has(otherId)) {
        const otherUser = m.senderId === ownerId ? m.recipient : m.sender;
        byUser.set(otherId, {
          userId: otherId,
          name: otherUser?.name ?? null,
          email: otherUser?.email ?? null,
          unread: 0,
          lastMessage: m.content,
          lastAt: m.createdAt.toISOString(),
        });
      }
      if (!m.read && m.senderId !== ownerId) {
        const t = byUser.get(otherId)!;
        t.unread += 1;
      }
    }
    return Array.from(byUser.values());
  } catch {
    return [];
  }
}

export default async function OwnerMessages() {
  const owner = await requireOwner();
  const threads = await loadThreads(owner.id);
  return (
    <PageShell>
      <div className="container py-12 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">Messages</p>
          <h1 className="font-serif text-4xl text-clay-dark mt-2">Conversations</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Threads</CardTitle>
          </CardHeader>
          <CardContent>
            {threads.length === 0 ? (
              <p className="text-sm text-clay-mid">No conversations yet.</p>
            ) : (
              <ul className="divide-y divide-terracotta-100">
                {threads.map((t) => (
                  <li key={t.userId}>
                    <Link
                      href={`/owner/messages/${t.userId}`}
                      className="flex items-center justify-between py-3 hover:bg-cream-100 -mx-2 px-2 rounded-md"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-clay-dark">{t.name || t.email}</span>
                          {t.unread > 0 && <Badge>{t.unread}</Badge>}
                        </div>
                        <div className="text-sm text-clay-mid truncate">{t.lastMessage}</div>
                      </div>
                      <span className="text-xs text-clay-mid shrink-0">
                        {formatDateTime(t.lastAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
