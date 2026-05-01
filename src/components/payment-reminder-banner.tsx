"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";
import { formatPrice } from "@/lib/utils";

export type PendingReminder = {
  id: string;
  bookingType: "BOOK_SESSIONS" | "RESIDENCY";
  // BOOK_SESSIONS: cumulative session range (e.g. 1..4).
  // RESIDENCY: sessionFrom = year*100+month of upcoming month being billed,
  //            sessionTo  = number of sessions in that month.
  sessionFrom: number;
  sessionTo: number;
  amount: number;
};

function residencyMonthLabel(key: number) {
  const year = Math.floor(key / 100);
  const month0 = (key % 100) - 1;
  return new Date(year, month0, 1).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function reminderTitle(r: PendingReminder) {
  if (r.bookingType === "RESIDENCY") {
    return `Residency · ${residencyMonthLabel(r.sessionFrom)} (${r.sessionTo} sessions)`;
  }
  return `Sessions ${r.sessionFrom}–${r.sessionTo}`;
}

function reminderSessionCount(r: PendingReminder) {
  if (r.bookingType === "RESIDENCY") return r.sessionTo;
  return r.sessionTo - r.sessionFrom + 1;
}

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
  const sessions = reminders.reduce((n, r) => n + reminderSessionCount(r), 0);
  const hasResidency = reminders.some((r) => r.bookingType === "RESIDENCY");
  const hasSessions = reminders.some((r) => r.bookingType === "BOOK_SESSIONS");

  let copy = "You've completed a block of 4 sessions. Settle up to keep the rhythm going.";
  if (hasResidency && hasSessions) {
    copy =
      "Drop-in sessions from this block plus your residency for next month are ready to pay.";
  } else if (hasResidency) {
    copy =
      "You've finished your 4th residency session this month — pay to lock in next month's schedule.";
  }

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
          <p className="text-sm text-clay-mid mt-1">{copy}</p>
        </div>
      </div>
      <div className="space-y-2">
        {reminders.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-md border border-terracotta-200 bg-card px-4 py-3"
          >
            <div>
              <div className="text-clay-dark font-medium">{reminderTitle(r)}</div>
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
