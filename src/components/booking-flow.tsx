"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { cn, DAY_NAMES, DAY_NAMES_SHORT, formatDate, formatPrice, formatTime } from "@/lib/utils";
import type { AvailabilityRule, SlotProposal } from "@/lib/availability";
import { generateSlotsForRange } from "@/lib/availability";

type Props = {
  pricing: { firstSession: number; residencyMonth: number };
  availability: AvailabilityRule[];
  isDemo?: boolean;
  isAuthenticated?: boolean;
};

type BookingType = "FIRST_SESSION" | "RESIDENCY";

export function BookingFlow({ pricing, availability, isDemo, isAuthenticated }: Props) {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "residency" ? "RESIDENCY" : null;

  const [step, setStep] = React.useState<1 | 2 | 3>(initialType ? 2 : 1);
  const [type, setType] = React.useState<BookingType | null>(
    initialType ? "RESIDENCY" : searchParams.get("type") === "first" ? (() => { return "FIRST_SESSION"; })() : null
  );

  // First-session pick: SlotProposal
  const [slot, setSlot] = React.useState<SlotProposal | null>(null);

  // Residency pick: dayOfWeek + HH:mm
  const [residencyDay, setResidencyDay] = React.useState<number | null>(null);
  const [residencyTime, setResidencyTime] = React.useState<string | null>(null);

  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const { toast } = useToast();

  function selectType(t: BookingType) {
    setType(t);
    setStep(2);
  }

  function handleConfirm() {
    if (isDemo) {
      toast("Demo mode — sign in to book for real.", "info");
      return;
    }
    if (!isAuthenticated) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/signin?callbackUrl=${next}`;
      return;
    }
    setSubmitting(true);
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        startTime: slot?.start.toISOString(),
        endTime: slot?.end.toISOString(),
        residencyDay,
        residencyTime,
        notes,
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed");
        const data = await r.json();
        if (data.url) window.location.href = data.url;
      })
      .catch((e) => {
        toast(e.message || "Could not start checkout", "error");
        setSubmitting(false);
      });
  }

  return (
    <div className="space-y-6">
      <Steps step={step} setStep={setStep} type={type} />

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <TypeCard
            title="First Session"
            desc="A single 2-hour intro on the wheel. Beginners welcome."
            price={formatPrice(pricing.firstSession)}
            onClick={() => selectType("FIRST_SESSION")}
          />
          <TypeCard
            title="Residency"
            desc="Four sessions a month at the same weekly time. Three-month minimum."
            price={`${formatPrice(pricing.residencyMonth)} / month`}
            onClick={() => selectType("RESIDENCY")}
          />
        </div>
      )}

      {step === 2 && type === "FIRST_SESSION" && (
        <FirstSessionPicker
          availability={availability}
          slot={slot}
          onPick={(s) => {
            setSlot(s);
            setStep(3);
          }}
        />
      )}

      {step === 2 && type === "RESIDENCY" && (
        <ResidencyPicker
          availability={availability}
          dayOfWeek={residencyDay}
          time={residencyTime}
          onPick={(d, t) => {
            setResidencyDay(d);
            setResidencyTime(t);
            setStep(3);
          }}
        />
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm & pay</CardTitle>
            <CardDescription>
              Review your booking. You'll be redirected to a secure Stripe checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Summary
              type={type!}
              slot={slot}
              residencyDay={residencyDay}
              residencyTime={residencyTime}
              pricing={pricing}
            />
            <div className="space-y-2">
              <Label htmlFor="notes">Notes for Miguel (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Anything we should know? Allergies, mobility, prior experience..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-terracotta-100">
              <Button variant="ghost" onClick={() => setStep(2)}>
                ← Back
              </Button>
              <Button onClick={handleConfirm} disabled={submitting} size="lg">
                {submitting ? "Redirecting..." : "Pay & confirm"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Steps({
  step,
  setStep,
  type,
}: {
  step: 1 | 2 | 3;
  setStep: (n: 1 | 2 | 3) => void;
  type: BookingType | null;
}) {
  const items = [
    { n: 1, label: "Type" },
    { n: 2, label: "Time" },
    { n: 3, label: "Confirm" },
  ];
  return (
    <ol className="flex items-center gap-2 text-sm">
      {items.map((it, i) => (
        <React.Fragment key={it.n}>
          <li>
            <button
              type="button"
              disabled={it.n > step || (it.n > 1 && !type)}
              onClick={() => setStep(it.n as 1 | 2 | 3)}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors",
                step === it.n
                  ? "bg-terracotta-500 text-white"
                  : it.n < step
                  ? "bg-cream-200 text-clay-dark"
                  : "bg-cream-100 text-clay-mid",
                it.n <= step && "cursor-pointer"
              )}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white/30 text-xs">
                {it.n}
              </span>
              {it.label}
            </button>
          </li>
          {i < items.length - 1 && <span className="text-terracotta-300">—</span>}
        </React.Fragment>
      ))}
    </ol>
  );
}

function TypeCard({
  title,
  desc,
  price,
  onClick,
}: {
  title: string;
  desc: string;
  price: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border border-terracotta-200 bg-card p-6 hover:border-terracotta-400 hover:shadow-md transition-all"
    >
      <div className="font-serif text-2xl text-clay-dark">{title}</div>
      <p className="mt-2 text-sm text-clay-mid">{desc}</p>
      <div className="mt-4 font-serif text-xl text-terracotta-700">{price}</div>
    </button>
  );
}

function FirstSessionPicker({
  availability,
  slot,
  onPick,
}: {
  availability: AvailabilityRule[];
  slot: SlotProposal | null;
  onPick: (s: SlotProposal) => void;
}) {
  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const horizonEnd = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 28);
    return d;
  }, [today]);

  const slots = React.useMemo(
    () => generateSlotsForRange(availability, today, horizonEnd).filter((s) => s.start > new Date()),
    [availability, today, horizonEnd]
  );

  const [selectedDate, setSelectedDate] = React.useState<string | null>(
    slots[0]?.date ?? null
  );

  const days = React.useMemo(() => {
    const map = new Map<string, SlotProposal[]>();
    for (const s of slots) {
      const arr = map.get(s.date) ?? [];
      arr.push(s);
      map.set(s.date, arr);
    }
    return Array.from(map.entries()).map(([date, items]) => ({ date, items }));
  }, [slots]);

  const visibleSlots = days.find((d) => d.date === selectedDate)?.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick a time</CardTitle>
        <CardDescription>
          Showing the next 4 weeks. Each session is 2 hours.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {days.length === 0 ? (
          <p className="text-sm text-clay-mid">
            No slots available right now. Drop a message to the studio and we'll find a time.
          </p>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {days.map((d) => {
                const date = new Date(d.date);
                return (
                  <button
                    key={d.date}
                    onClick={() => setSelectedDate(d.date)}
                    className={cn(
                      "shrink-0 rounded-lg border p-3 min-w-[88px] text-center transition-all",
                      selectedDate === d.date
                        ? "border-terracotta-500 bg-terracotta-50 text-clay-dark"
                        : "border-terracotta-200 hover:border-terracotta-300 bg-card"
                    )}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-clay-mid">
                      {DAY_NAMES_SHORT[date.getDay()]}
                    </div>
                    <div className="font-serif text-2xl text-clay-dark">{date.getDate()}</div>
                    <div className="text-[10px] text-clay-mid">
                      {date.toLocaleString("en-GB", { month: "short" })}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {visibleSlots.map((s) => {
                const active =
                  slot && slot.start.getTime() === s.start.getTime();
                return (
                  <button
                    key={s.start.toISOString()}
                    onClick={() => onPick(s)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-all",
                      active
                        ? "border-terracotta-500 bg-terracotta-100"
                        : "border-terracotta-200 hover:border-terracotta-400 bg-card"
                    )}
                  >
                    {formatTime(s.start)} – {formatTime(s.end)}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ResidencyPicker({
  availability,
  dayOfWeek,
  time,
  onPick,
}: {
  availability: AvailabilityRule[];
  dayOfWeek: number | null;
  time: string | null;
  onPick: (dow: number, time: string) => void;
}) {
  // Collect recurring slots grouped by day-of-week
  const grouped = React.useMemo(() => {
    const map = new Map<number, Set<string>>();
    for (const r of availability) {
      if (!r.isRecurring || !r.recurringPattern) continue;
      const { daysOfWeek, startTime, endTime } = r.recurringPattern;
      for (const dow of daysOfWeek) {
        const set = map.get(dow) ?? new Set<string>();
        // Generate 2-hour slot start times within the range
        const [sh, sm] = startTime.split(":").map((n) => parseInt(n, 10));
        const [eh, em] = endTime.split(":").map((n) => parseInt(n, 10));
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        for (let m = startMin; m + 120 <= endMin; m += 120) {
          const h = Math.floor(m / 60);
          const mm = m % 60;
          set.add(
            `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`
          );
        }
        map.set(dow, set);
      }
    }
    return map;
  }, [availability]);

  const dows = Array.from(grouped.keys()).sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick your weekly slot</CardTitle>
        <CardDescription>
          You'll have this same time every week. The first month creates 4 sessions in your
          calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {dows.length === 0 ? (
          <p className="text-sm text-clay-mid">
            No recurring availability set. The studio will reach out to schedule.
          </p>
        ) : (
          dows.map((dow) => {
            const times = Array.from(grouped.get(dow) ?? []).sort();
            return (
              <div key={dow}>
                <div className="font-serif text-lg text-clay-dark mb-2">{DAY_NAMES[dow]}s</div>
                <div className="flex flex-wrap gap-2">
                  {times.map((t) => {
                    const active = dayOfWeek === dow && time === t;
                    return (
                      <button
                        key={`${dow}-${t}`}
                        onClick={() => onPick(dow, t)}
                        className={cn(
                          "rounded-md border px-3 py-2 text-sm",
                          active
                            ? "border-terracotta-500 bg-terracotta-100"
                            : "border-terracotta-200 hover:border-terracotta-400 bg-card"
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function Summary({
  type,
  slot,
  residencyDay,
  residencyTime,
  pricing,
}: {
  type: BookingType;
  slot: SlotProposal | null;
  residencyDay: number | null;
  residencyTime: string | null;
  pricing: { firstSession: number; residencyMonth: number };
}) {
  return (
    <div className="rounded-lg bg-cream-100 p-5 space-y-2">
      <div className="flex justify-between">
        <span className="text-clay-mid text-sm">Type</span>
        <Badge variant="secondary">
          {type === "FIRST_SESSION" ? "First Session" : "Residency"}
        </Badge>
      </div>
      {type === "FIRST_SESSION" && slot && (
        <>
          <div className="flex justify-between">
            <span className="text-clay-mid text-sm">When</span>
            <span className="text-clay-dark">{formatDate(slot.start)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-clay-mid text-sm">Time</span>
            <span className="text-clay-dark">
              {formatTime(slot.start)} – {formatTime(slot.end)}
            </span>
          </div>
        </>
      )}
      {type === "RESIDENCY" && residencyDay !== null && residencyTime && (
        <div className="flex justify-between">
          <span className="text-clay-mid text-sm">Weekly slot</span>
          <span className="text-clay-dark">
            {DAY_NAMES[residencyDay]} at {residencyTime}
          </span>
        </div>
      )}
      <div className="flex justify-between pt-2 border-t border-terracotta-200">
        <span className="text-clay-mid text-sm">Due now</span>
        <span className="font-serif text-xl text-clay-dark">
          {formatPrice(
            type === "FIRST_SESSION" ? pricing.firstSession : pricing.residencyMonth
          )}
          {type === "RESIDENCY" && (
            <span className="text-xs text-clay-mid font-sans"> / first month</span>
          )}
        </span>
      </div>
    </div>
  );
}
