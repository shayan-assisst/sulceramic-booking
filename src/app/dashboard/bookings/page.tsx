import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoBookings } from "@/lib/demo-data";
import { formatDate, formatTime, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadAll(userId: string) {
  if (env.isDemo) return demoBookings;
  try {
    return await prisma.booking.findMany({
      where: { userId },
      orderBy: { startTime: "desc" },
      include: { residency: true },
    });
  } catch {
    return [];
  }
}

export default async function BookingsPage() {
  const user = await requireUser();
  const bookings = await loadAll(user.id);
  return (
    <PageShell>
      <div className="container py-12 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">Bookings</p>
          <h1 className="font-serif text-4xl text-clay-dark mt-2">Your sessions</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-clay-mid">
                No bookings yet —{" "}
                <Link href="/book" className="underline text-terracotta-600">
                  book your first session
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-terracotta-100">
                {bookings.map((b: any) => (
                  <li key={b.id}>
                    <Link
                      href={`/dashboard/booking/${b.id}`}
                      className="flex items-center justify-between py-4 hover:bg-cream-100 -mx-2 px-2 rounded-md"
                    >
                      <div>
                        <div className="font-medium text-clay-dark">
                          {b.type === "FIRST_SESSION" ? "First Session" : "Residency"}
                        </div>
                        <div className="text-sm text-clay-mid">
                          {formatDate(b.startTime)} · {formatTime(b.startTime)}–
                          {formatTime(b.endTime)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {b.amountPaid && (
                          <span className="text-sm text-clay-mid">
                            {formatPrice(b.amountPaid)}
                          </span>
                        )}
                        <Badge
                          variant={
                            b.status === "CONFIRMED"
                              ? "success"
                              : b.status === "PENDING"
                              ? "warning"
                              : "muted"
                          }
                        >
                          {b.status.toLowerCase()}
                        </Badge>
                      </div>
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
