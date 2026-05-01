import { PageShell } from "@/components/page-shell";
import { AvailabilityEditor } from "@/components/availability-editor";
import { requireOwner } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { demoAvailability } from "@/lib/demo-data";
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

export default async function OwnerAvailability() {
  await requireOwner();
  const rules = await loadAvailability();
  return (
    <PageShell>
      <div className="container py-12 space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-terracotta-600">Availability</p>
          <h1 className="font-serif text-4xl text-clay-dark mt-2">When the studio is open</h1>
          <p className="text-clay-mid mt-2 max-w-2xl">
            Set recurring weekly availability and block individual dates when you're away. Slots
            are 2 hours each.
          </p>
        </div>
        <AvailabilityEditor initial={rules} isDemo={env.isDemo} />
      </div>
    </PageShell>
  );
}
