import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoOwnerView } from "@/lib/demo-data";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadOwnerOverview() {
  if (env.isDemo) {
    return {
      todayBookings: demoOwnerView.upcomingToday,
      thisWeekCount: demoOwnerView.thisWeekSessions,
      pendingMessages: demoOwnerView.pendingMessages,
    };
  }
  try {
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const endToday = new Date(startToday);
    endToday.setDate(endToday.getDate() + 1);
    const endWeek = new Date(startToday);
    endWeek.setDate(endWeek.getDate() + 7);

    const todayBookings = await prisma.booking.findMany({
      where: {
        startTime: { gte: startToday, lt: endToday },
        status: { not: "CANCELLED" },
      },
      include: { user: true },
      orderBy: { startTime: "asc" },
    });
    const thisWeekCount = await prisma.booking.count({
      where: {
        startTime: { gte: startToday, lt: endWeek },
        status: { not: "CANCELLED" },
      },
    });
    const pendingMessages = await prisma.message.count({
      where: { read: false, recipientId: null },
    });
    return { todayBookings, thisWeekCount, pendingMessages };
  } catch {
    return { todayBookings: [], thisWeekCount: 0, pendingMessages: 0 };
  }
}

export default async function OwnerDashboard() {
  const owner = await requireOwner();
  const { todayBookings, thisWeekCount, pendingMessages } = await loadOwnerOverview();
  return (
    <PageShell>
      <div className="container py-12 space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">Studio</p>
          <h1 className="font-serif text-4xl text-clay-dark mt-2">
            Bom dia, {owner.name?.split(" ")[0] || "Miguel"}.
          </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Today</CardDescription>
              <CardTitle className="text-3xl">
                {todayBookings.length} {todayBookings.length === 1 ? "session" : "sessions"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>This week</CardDescription>
              <CardTitle className="text-3xl">{thisWeekCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Unread messages</CardDescription>
              <CardTitle className="text-3xl">{pendingMessages}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/owner/messages">Open messages</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Today's schedule</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-terracotta-100">
            {todayBookings.length === 0 ? (
              <p className="text-sm text-clay-mid">No sessions today.</p>
            ) : (
              todayBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-clay-dark">
                      {b.userName || b.user?.name || "Guest"}
                    </div>
                    <div className="text-sm text-clay-mid">
                      {b.type === "BOOK_SESSIONS" ? "Book Sessions" : "Residency"} ·{" "}
                      {formatTime(b.startTime)}–{formatTime(b.endTime)}
                    </div>
                  </div>
                  <Badge variant="success">today</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Set availability</CardTitle>
              <CardDescription>
                Add recurring slots, exceptions, and one-off times.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/owner/availability">Open calendar</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>All bookings</CardTitle>
              <CardDescription>See past and upcoming sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/owner/bookings">View bookings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
