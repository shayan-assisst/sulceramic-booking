"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { formatPrice } from "@/lib/utils";

export type PendingReminder = {
  id: string;
  sessionFrom: number;
  sessionTo: number;
  amount: number;
};

export function PaymentReminderBanner({
  reminders,
  isDemo,
}: {
  reminders: PendingReminder[];
  isDemo?: boolean;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  if (!reminders || reminders.length === 0) return null;

  const total = reminders.reduce((sum, r) => sum + r.amount, 0);
  const sessions = reminders.reduce((n, r) => n + (r.sessionTo - r.sessionFrom + 1), 0);

  function payNow(id: string) {
    if (isDemo) {
      toast("Demo mode — sign in to pay for real.", "info");
      return;
    }
    setBusy(id);
    fetch("/api/checkout/payment-reminder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reminderId: id }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Could not start checkout");
        const data = await r.json();
        if (data.url) window.location.href = data.url;
      })
      .catch((e) => {
        toast(e.message, "error");
        setBusy(null);
      });
  }

  return (
    <div className="rounded-xl border border-terracotta-300 bg-terracotta-50 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wider text-terracotta-700">
            Payment due
          </div>
          <h2 className="font-serif text-2xl text-clay-dark mt-1">
            {sessions} unpaid {sessions === 1 ? "session" : "sessions"} · {formatPrice(total)}
          </h2>
          <p className="text-sm text-clay-mid mt-1">
            You've completed a block of 4 sessions. Settle up to keep the rhythm going.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        {reminders.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-md border border-terracotta-200 bg-card px-4 py-3"
          >
            <div>
              <div className="text-clay-dark font-medium">
                Sessions {r.sessionFrom}–{r.sessionTo}
              </div>
              <div className="text-xs text-clay-mid">{formatPrice(r.amount)}</div>
            </div>
            <Button onClick={() => payNow(r.id)} disabled={busy === r.id} size="sm">
              {busy === r.id ? "Redirecting..." : "Pay now"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
