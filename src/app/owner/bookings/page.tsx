import { PageShell } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoBookings, demoUser } from "@/lib/demo-data";
import { formatDate, formatTime, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function loadAllBookings() {
  if (env.isDemo) {
    return demoBookings.map((b) => ({ ...b, user: demoUser }));
  }
  try {
    return await prisma.booking.findMany({
      orderBy: { startTime: "desc" },
      include: { user: true, residency: true },
      take: 200,
    });
  } catch {
    return [];
  }
}

export default async function OwnerBookings() {
  await requireOwner();
  const bookings = await loadAllBookings();
  return (
    <PageShell>
      <div className="container py-12 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">Bookings</p>
          <h1 className="font-serif text-4xl text-clay-dark mt-2">All sessions</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent & upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-clay-mid">No bookings yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-clay-mid">
                    <tr className="text-left border-b border-terracotta-100">
                      <th className="py-2 pr-4">When</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Guest</th>
                      <th className="py-2 pr-4">Paid</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b: any) => (
                      <tr key={b.id} className="border-b border-terracotta-50">
                        <td className="py-3 pr-4">
                          <div className="text-clay-dark">{formatDate(b.startTime)}</div>
                          <div className="text-xs text-clay-mid">
                            {formatTime(b.startTime)}–{formatTime(b.endTime)}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {b.type === "BOOK_SESSIONS" ? "Sessions" : "Residency"}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="text-clay-dark">{b.user?.name || "—"}</div>
                          <div className="text-xs text-clay-mid">{b.user?.email}</div>
                        </td>
                        <td className="py-3 pr-4">
                          {b.amountPaid ? formatPrice(b.amountPaid) : "—"}
                        </td>
                        <td className="py-3 pr-4">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
