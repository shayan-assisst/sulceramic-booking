import { Suspense } from "react";
import { PageShell } from "@/components/page-shell";
import { BookingFlow } from "@/components/booking-flow";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { demoAvailability } from "@/lib/demo-data";
import { getCurrentUser } from "@/lib/auth-helpers";
import type { AvailabilityRule } from "@/lib/availability";

export const dynamic = "force-dynamic";

async function loadAvailability(): Promise<AvailabilityRule[]> {
  if (env.isDemo) {
    return demoAvailability.map((a) => ({
      id: a.id,
      isRecurring: a.isRecurring,
      recurringPattern: a.recurringPattern,
      exceptions: a.exceptions,
    }));
  }
  try {
    const rows = await prisma.availabilitySlot.findMany();
    return rows.map((r) => ({
      id: r.id,
      isRecurring: r.isRecurring,
      recurringPattern: r.recurringPattern ? JSON.parse(r.recurringPattern) : null,
      startTime: r.startTime,
      endTime: r.endTime,
      exceptions: r.exceptions ? JSON.parse(r.exceptions) : [],
    }));
  } catch {
    return [];
  }
}

export default async function BookPage() {
  const availability = await loadAvailability();
  const user = await getCurrentUser();
  return (
    <PageShell>
      <div className="container max-w-3xl py-12">
        <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">Book</p>
        <h1 className="font-serif text-4xl text-clay-dark mt-2 mb-2">
          Reserve your time at the wheel
        </h1>
        <p className="text-clay-mid mb-8">
          Three quick steps. You can reach out by message before paying if you're unsure which
          format suits you.
        </p>
        <Suspense fallback={<div className="text-clay-mid text-sm">Loading...</div>}>
          <BookingFlow
            availability={availability}
            isDemo={env.isDemo}
            isAuthenticated={!!user}
            pricing={{
              firstSession: env.priceFirstSession,
              residencyMonth: env.priceResidencyMonth,
            }}
          />
        </Suspense>
      </div>
    </PageShell>
  );
}
