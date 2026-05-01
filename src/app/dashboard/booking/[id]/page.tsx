import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoBookings } from "@/lib/demo-data";
import { formatDate, formatTime, formatPrice, DAY_NAMES } from "@/lib/utils";
import { BookingActions } from "@/components/booking-actions";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  if (env.isDemo) return demoBookings.map((b) => ({ id: b.id }));
  return [];
}

async function loadBooking(id: string, userId: string) {
  if (env.isDemo) {
    return demoBookings.find((b) => b.id === id) ?? null;
  }
  try {
    return await prisma.booking.findFirst({
      where: { id, userId },
      include: { residency: true },
    });
  } catch {
    return null;
  }
}

export default async function BookingDetail({ params }: { params: { id: string } }) {
  const user = await requireUser();
  const booking: any = await loadBooking(params.id, user.id);
  if (!booking) notFound();

  const sessions = booking.residency
    ? typeof booking.residency.sessions === "string"
      ? JSON.parse(booking.residency.sessions)
      : booking.residency.sessions
    : null;

  const residencyDays: number[] | null = booking.residency
    ? typeof booking.residency.daysOfWeek === "string"
      ? JSON.parse(booking.residency.daysOfWeek)
      : booking.residency.daysOfWeek
    : null;

  return (
    <PageShell>
      <div className="container max-w-3xl py-12 space-y-6">
        <Link
          href="/dashboard/bookings"
          className="text-sm text-clay-mid hover:text-clay-dark"
        >
          ← Back to bookings
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardDescription>
                  {booking.type === "BOOK_SESSIONS" ? "Book Sessions" : "Residency"}
                </CardDescription>
                <CardTitle className="text-3xl">{formatDate(booking.startTime)}</CardTitle>
                <p className="mt-1 text-clay-mid">
                  {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                </p>
              </div>
              <Badge
                variant={
                  booking.status === "CONFIRMED"
                    ? "success"
                    : booking.status === "PENDING"
                    ? "warning"
                    : "muted"
                }
              >
                {booking.status.toLowerCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.amountPaid ? (
              <div className="text-sm text-clay-mid">
                Paid: <span className="text-clay-dark">{formatPrice(booking.amountPaid)}</span>
              </div>
            ) : booking.type === "BOOK_SESSIONS" ? (
              <div className="text-sm text-clay-mid">
                Payment is collected after every 4 confirmed sessions.
              </div>
            ) : null}
            {booking.notes && (
              <div>
                <div className="text-xs uppercase tracking-wider text-clay-mid mb-1">
                  Notes for studio
                </div>
                <p className="text-sm text-clay-dark">{booking.notes}</p>
              </div>
            )}
            <BookingActions booking={booking} isDemo={env.isDemo} />
          </CardContent>
        </Card>

        {sessions && (
          <Card>
            <CardHeader>
              <CardTitle>Residency schedule</CardTitle>
              <CardDescription>
                {residencyDays && residencyDays.length > 0
                  ? `Every ${residencyDays.map((d) => DAY_NAMES[d]).join(", ")}.`
                  : "Recurring sessions."}{" "}
                You can reschedule individual sessions up to 24h in advance.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-terracotta-100">
              {sessions.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-clay-dark">
                      {formatDate(s.rescheduled || s.startTime || s.date)}
                    </div>
                    <div className="text-sm text-clay-mid">
                      {formatTime(s.startTime)} – {formatTime(s.endTime)}
                    </div>
                  </div>
                  {s.cancelled ? (
                    <Badge variant="muted">cancelled</Badge>
                  ) : s.rescheduled ? (
                    <Badge variant="warning">rescheduled</Badge>
                  ) : (
                    <Badge variant="success">scheduled</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
