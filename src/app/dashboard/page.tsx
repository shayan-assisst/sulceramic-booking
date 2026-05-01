import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoBookings } from "@/lib/demo-data";
import { formatDate, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadUpcoming(userId: string) {
  if (env.isDemo) return demoBookings;
  try {
    return await prisma.booking.findMany({
      where: {
        userId,
        status: { not: "CANCELLED" },
        startTime: { gte: new Date() },
      },
      orderBy: { startTime: "asc" },
      include: { residency: true },
      take: 5,
    });
  } catch {
    return [];
  }
}

export default async function DashboardPage() {
  const user = await requireUser();
  const upcoming = await loadUpcoming(user.id);
  return (
    <PageShell>
      <div className="container py-12 space-y-8">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">Welcome back</p>
          <h1 className="font-serif text-4xl text-clay-dark mt-2">
            Hi {user.name?.split(" ")[0] || "there"}.
          </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardDescription>Next session</CardDescription>
              <CardTitle className="text-3xl">
                {upcoming[0] ? formatDate(upcoming[0].startTime as any) : "Nothing scheduled"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming[0] ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/booking/${upcoming[0].id}`}>View details</Link>
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link href="/book">Book one</Link>
                </Button>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Upcoming sessions</CardDescription>
              <CardTitle className="text-3xl">{upcoming.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/bookings">See all</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Need to talk?</CardDescription>
              <CardTitle className="text-2xl">Message the studio</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href="/dashboard/messages">Open messages</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming bookings</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-terracotta-100">
            {upcoming.length === 0 && (
              <p className="text-sm text-clay-mid">
                You don't have any upcoming sessions yet.{" "}
                <Link href="/book" className="underline text-terracotta-600">
                  Book a session
                </Link>
                .
              </p>
            )}
            {upcoming.map((b: any) => (
              <Link
                key={b.id}
                href={`/dashboard/booking/${b.id}`}
                className="flex items-center justify-between py-3 hover:bg-cream-100 -mx-2 px-2 rounded-md"
              >
                <div>
                  <div className="font-medium text-clay-dark">
                    {b.type === "FIRST_SESSION" ? "First Session" : "Residency"}
                  </div>
                  <div className="text-sm text-clay-mid">
                    {formatDate(b.startTime)} · {formatTime(b.startTime)}–{formatTime(b.endTime)}
                  </div>
                </div>
                <Badge
                  variant={b.status === "CONFIRMED" ? "success" : b.status === "PENDING" ? "warning" : "muted"}
                >
                  {b.status.toLowerCase()}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
