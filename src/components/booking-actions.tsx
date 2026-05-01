"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toaster";

export function BookingActions({
  booking,
  isDemo,
}: {
  booking: { id: string; status: string; startTime: string | Date };
  isDemo?: boolean;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const startsAt = new Date(booking.startTime);
  const cancellable =
    booking.status === "CONFIRMED" &&
    startsAt.getTime() - Date.now() > 24 * 60 * 60 * 1000;

  function cancel() {
    if (isDemo) {
      toast("Demo mode — sign in to cancel for real.", "info");
      return;
    }
    if (!confirm("Cancel this booking?")) return;
    setBusy(true);
    fetch(`/api/bookings/${booking.id}/cancel`, { method: "POST" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Could not cancel");
        toast("Booking cancelled.", "success");
        window.location.reload();
      })
      .catch((e) => toast(e.message, "error"))
      .finally(() => setBusy(false));
  }

  if (booking.status === "CANCELLED") return null;

  return (
    <div className="flex gap-3 pt-4 border-t border-terracotta-100">
      {cancellable ? (
        <Button variant="outline" disabled={busy} onClick={cancel}>
          {busy ? "Cancelling..." : "Cancel booking"}
        </Button>
      ) : (
        <p className="text-xs text-clay-mid">
          Cancellation closes 24h before the session starts.
        </p>
      )}
    </div>
  );
}
