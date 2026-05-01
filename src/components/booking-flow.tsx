"use client";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toaster";
import { cn, DAY_NAMES, DAY_NAMES_SHORT, formatDate, formatPrice, formatTime } from "@/lib/utils";
import type { AvailabilityRule, SlotProposal } from "@/lib/availability";
import {
  generateSlotsForRange,
  generateRecurringSessions,
  generateResidencySessionsFromPattern,
} from "@/lib/availability";

type Props = {
  pricing: { perSession: number; residencySession: number };
  availability: AvailabilityRule[];
  isDemo?: boolean;
  isAuthenticated?: boolean;
};

type BookingType = "BOOK_SESSIONS" | "RESIDENCY";
type BookSubMode = "specific" | "recurring";

export function BookingFlow({ pricing, availability, isDemo, isAuthenticated }: Props) {
  const searchParams = useSearchParams();
  const initialType: BookingType | null =
    searchParams.get("type") === "residency"
      ? "RESIDENCY"
      : searchParams.get("type") === "sessions" || searchParams.get("type") === "first"
      ? "BOOK_SESSIONS"
      : null;

  const [step, setStep] = React.useState<1 | 2 | 3>(initialType ? 2 : 1);
  const [type, setType] = React.useState<BookingType | null>(initialType);

  // Book Sessions: list of picked SlotProposals, plus a sub-mode toggle.
  const [subMode, setSubMode] = React.useState<BookSubMode>("specific");
  const [picks, setPicks] = React.useState<SlotProposal[]>([]);
  // Recurring config
  const [recDays, setRecDays] = React.useState<number[]>([1]); // default Monday
  const [recTime, setRecTime] = React.useState<string>("18:00");
  const [recCount, setRecCount] = React.useState<number>(4);

  // Residency picks
  const [resDays, setResDays] = React.useState<number[]>([]);
  const [resPerWeek, setResPerWeek] = React.useState<1 | 2>(1);
  const [resStartDate, setResStartDate] = React.useState<string>(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return t.toISOString().slice(0, 10);
  });
  const [resTime, setResTime] = React.useState<string>("18:00");

  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const { toast } = useToast();

  function selectType(t: BookingType) {
    setType(t);
    setStep(2);
  }

  function addPick(s: SlotProposal) {
    setPicks((prev) => {
      if (prev.find((p) => p.start.getTime() === s.start.getTime())) return prev;
      return [...prev, s].sort((a, b) => a.start.getTime() - b.start.getTime());
    });
  }
  function removePick(s: SlotProposal) {
    setPicks((prev) => prev.filter((p) => p.start.getTime() !== s.start.getTime()));
  }

  function previewRecurring(): SlotProposal[] {
    return generateRecurringSessions(recDays, recTime, recCount);
  }
  function previewResidency(): SlotProposal[] {
    const start = new Date(resStartDate + "T00:00:00");
    const sessions = generateResidencySessionsFromPattern({
      daysOfWeek: resDays,
      time: resTime,
      sessionsPerWeek: resPerWeek,
      startDate: start,
    });
    return sessions.map((s) => ({
      date: s.date,
      start: new Date(s.startTime),
      end: new Date(s.endTime),
    }));
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

    let payload: any;
    if (type === "BOOK_SESSIONS") {
      const sessions =
        subMode === "specific"
          ? picks.map((p) => ({ startTime: p.start.toISOString(), endTime: p.end.toISOString() }))
          : previewRecurring().map((p) => ({
              startTime: p.start.toISOString(),
              endTime: p.end.toISOString(),
            }));
      if (sessions.length === 0) {
        toast("Pick at least one session.", "error");
        return;
      }
      payload = {
        type,
        sessions,
        recurringPattern:
          subMode === "recurring"
            ? { daysOfWeek: recDays, time: recTime, sessionCount: recCount }
            : null,
        notes,
      };
    } else if (type === "RESIDENCY") {
      if (resDays.length === 0) {
        toast("Pick at least one day of week.", "error");
        return;
      }
      payload = {
        type,
        residency: {
          daysOfWeek: resDays,
          sessionsPerWeek: resPerWeek,
          startDate: new Date(resStartDate + "T00:00:00").toISOString(),
          time: resTime,
        },
        notes,
      };
    }

    setSubmitting(true);
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error || "Failed");
        const data = await r.json();
        if (data.url) window.location.href = data.url;
      })
      .catch((e) => {
        toast(e.message || "Could not complete booking", "error");
        setSubmitting(false);
      });
  }

  return (
    <div className="space-y-6">
      <Steps step={step} setStep={setStep} type={type} />

      {step === 1 && (
        <div className="grid md:grid-cols-2 gap-6">
          <TypeCard
            title="Book Sessions"
            desc="Pick one or more sessions or set a weekly recurring schedule. Pay after every 4 sessions."
            price={`${formatPrice(pricing.perSession)} / session`}
            onClick={() => selectType("BOOK_SESSIONS")}
          />
          <TypeCard
            title="Residency"
            desc="Commit to a regular practice. Choose your days, session count, and pay monthly."
            price={`${formatPrice(pricing.residencySession)} / session`}
            onClick={() => selectType("RESIDENCY")}
          />
        </div>
      )}

      {step === 2 && type === "BOOK_SESSIONS" && (
        <BookSessionsPicker
          availability={availability}
          subMode={subMode}
          setSubMode={setSubMode}
          picks={picks}
          addPick={addPick}
          removePick={removePick}
          recDays={recDays}
          setRecDays={setRecDays}
          recTime={recTime}
          setRecTime={setRecTime}
          recCount={recCount}
          setRecCount={setRecCount}
          recurringPreview={previewRecurring()}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 2 && type === "RESIDENCY" && (
        <ResidencyPicker
          resDays={resDays}
          setResDays={setResDays}
          resPerWeek={resPerWeek}
          setResPerWeek={setResPerWeek}
          resStartDate={resStartDate}
          setResStartDate={setResStartDate}
          resTime={resTime}
          setResTime={setResTime}
          preview={previewResidency()}
          pricePerSession={pricing.residencySession}
          onContinue={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {type === "BOOK_SESSIONS" ? "Confirm sessions" : "Confirm & pay"}
            </CardTitle>
            <CardDescription>
              {type === "BOOK_SESSIONS"
                ? "Review your sessions. No payment now — you'll be reminded after every 4 sessions."
                : "Review your residency. You'll be redirected to a secure Stripe checkout for the first month."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Summary
              type={type!}
              subMode={subMode}
              picks={picks}
              recurringPreview={previewRecurring()}
              residencyPreview={previewResidency()}
              residencyMeta={{
                daysOfWeek: resDays,
                sessionsPerWeek: resPerWeek,
                time: resTime,
              }}
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
                {submitting
                  ? "Working..."
                  : type === "BOOK_SESSIONS"
                  ? "Confirm sessions"
                  : "Pay & confirm"}
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
    { n: 2, label: "Sessions" },
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

function DayToggle({
  value,
  onChange,
}: {
  value: number[];
  onChange: (next: number[]) => void;
}) {
  function toggle(d: number) {
    if (value.includes(d)) onChange(value.filter((x) => x !== d));
    else onChange([...value, d].sort());
  }
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => toggle(d)}
          className={cn(
            "rounded-md border px-3 py-2 text-sm transition-colors",
            value.includes(d)
              ? "border-terracotta-500 bg-terracotta-100 text-clay-dark"
              : "border-terracotta-200 hover:border-terracotta-400 bg-card text-clay-mid"
          )}
        >
          {DAY_NAMES_SHORT[d]}
        </button>
      ))}
    </div>
  );
}

function BookSessionsPicker({
  availability,
  subMode,
  setSubMode,
  picks,
  addPick,
  removePick,
  recDays,
  setRecDays,
  recTime,
  setRecTime,
  recCount,
  setRecCount,
  recurringPreview,
  onContinue,
}: {
  availability: AvailabilityRule[];
  subMode: BookSubMode;
  setSubMode: (s: BookSubMode) => void;
  picks: SlotProposal[];
  addPick: (s: SlotProposal) => void;
  removePick: (s: SlotProposal) => void;
  recDays: number[];
  setRecDays: (n: number[]) => void;
  recTime: string;
  setRecTime: (s: string) => void;
  recCount: number;
  setRecCount: (n: number) => void;
  recurringPreview: SlotProposal[];
  onContinue: () => void;
}) {
  const today = React.useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const horizonEnd = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 56);
    return d;
  }, [today]);

  const slots = React.useMemo(
    () =>
      generateSlotsForRange(availability, today, horizonEnd).filter(
        (s) => s.start > new Date()
      ),
    [availability, today, horizonEnd]
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

  const [selectedDate, setSelectedDate] = React.useState<string | null>(
    days[0]?.date ?? null
  );
  const visibleSlots = days.find((d) => d.date === selectedDate)?.items ?? [];

  const selectedList = subMode === "specific" ? picks : recurringPreview;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pick your sessions</CardTitle>
        <CardDescription>
          Choose specific dates, or set a recurring pattern (e.g. every Monday at 18:00).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="inline-flex rounded-lg border border-terracotta-200 bg-card p-1 text-sm">
          <button
            onClick={() => setSubMode("specific")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors",
              subMode === "specific"
                ? "bg-terracotta-500 text-white"
                : "text-clay-mid hover:text-clay-dark"
            )}
          >
            Pick specific dates
          </button>
          <button
            onClick={() => setSubMode("recurring")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-colors",
              subMode === "recurring"
                ? "bg-terracotta-500 text-white"
                : "text-clay-mid hover:text-clay-dark"
            )}
          >
            Set recurring schedule
          </button>
        </div>

        {subMode === "specific" ? (
          days.length === 0 ? (
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
                  const active = picks.find((p) => p.start.getTime() === s.start.getTime());
                  return (
                    <button
                      key={s.start.toISOString()}
                      onClick={() => (active ? removePick(s) : addPick(s))}
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
          )
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Days of week</Label>
              <DayToggle value={recDays} onChange={setRecDays} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="recTime">Time</Label>
                <input
                  id="recTime"
                  type="time"
                  value={recTime}
                  onChange={(e) => setRecTime(e.target.value)}
                  className="h-10 w-full rounded-md border border-terracotta-200 bg-card px-3 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recCount">Number of sessions</Label>
                <input
                  id="recCount"
                  type="number"
                  min={1}
                  max={52}
                  value={recCount}
                  onChange={(e) => setRecCount(Math.max(1, parseInt(e.target.value || "1", 10)))}
                  className="h-10 w-full rounded-md border border-terracotta-200 bg-card px-3 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <SelectedList
          items={selectedList}
          removable={subMode === "specific"}
          onRemove={removePick}
        />

        <div className="flex justify-end">
          <Button onClick={onContinue} disabled={selectedList.length === 0}>
            Continue ({selectedList.length}{" "}
            {selectedList.length === 1 ? "session" : "sessions"}) →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SelectedList({
  items,
  removable,
  onRemove,
}: {
  items: SlotProposal[];
  removable: boolean;
  onRemove: (s: SlotProposal) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg bg-cream-100 p-4 text-sm text-clay-mid">
        No sessions selected yet.
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-cream-100 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-clay-mid">Selected sessions</div>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <ul className="divide-y divide-terracotta-100">
        {items.map((s) => (
          <li
            key={s.start.toISOString()}
            className="flex items-center justify-between py-2"
          >
            <div>
              <div className="text-clay-dark">{formatDate(s.start)}</div>
              <div className="text-xs text-clay-mid">
                {formatTime(s.start)} – {formatTime(s.end)}
              </div>
            </div>
            {removable && (
              <button
                onClick={() => onRemove(s)}
                className="text-xs text-terracotta-700 hover:underline"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResidencyPicker({
  resDays,
  setResDays,
  resPerWeek,
  setResPerWeek,
  resStartDate,
  setResStartDate,
  resTime,
  setResTime,
  preview,
  pricePerSession,
  onContinue,
}: {
  resDays: number[];
  setResDays: (n: number[]) => void;
  resPerWeek: 1 | 2;
  setResPerWeek: (n: 1 | 2) => void;
  resStartDate: string;
  setResStartDate: (s: string) => void;
  resTime: string;
  setResTime: (s: string) => void;
  preview: SlotProposal[];
  pricePerSession: number;
  onContinue: () => void;
}) {
  const total = preview.length * pricePerSession;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Build your residency</CardTitle>
        <CardDescription>
          Pick the days you want to come, how many sessions per week, and your start date. The
          first month is generated and paid upfront.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Days of week</Label>
          <DayToggle value={resDays} onChange={setResDays} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Sessions per week</Label>
            <div className="flex gap-2">
              {[1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setResPerWeek(n as 1 | 2)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm",
                    resPerWeek === n
                      ? "border-terracotta-500 bg-terracotta-100"
                      : "border-terracotta-200 hover:border-terracotta-400 bg-card"
                  )}
                >
                  {n} / week
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="resTime">Time</Label>
            <input
              id="resTime"
              type="time"
              value={resTime}
              onChange={(e) => setResTime(e.target.value)}
              className="h-10 w-full rounded-md border border-terracotta-200 bg-card px-3 text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="resStart">Start date</Label>
          <input
            id="resStart"
            type="date"
            value={resStartDate}
            onChange={(e) => setResStartDate(e.target.value)}
            className="h-10 w-full rounded-md border border-terracotta-200 bg-card px-3 text-sm"
          />
        </div>
        <div className="rounded-lg bg-cream-100 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-clay-mid">First month</div>
            <Badge variant="secondary">{preview.length} sessions</Badge>
          </div>
          {preview.length === 0 ? (
            <p className="text-sm text-clay-mid">
              Pick at least one day of week to preview your sessions.
            </p>
          ) : (
            <ul className="divide-y divide-terracotta-100">
              {preview.map((s) => (
                <li
                  key={s.start.toISOString()}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <div className="text-clay-dark">{formatDate(s.start)}</div>
                    <div className="text-xs text-clay-mid">
                      {formatTime(s.start)} – {formatTime(s.end)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-between pt-2 border-t border-terracotta-200">
            <span className="text-clay-mid text-sm">First month total</span>
            <span className="font-serif text-xl text-clay-dark">{formatPrice(total)}</span>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onContinue} disabled={preview.length === 0}>
            Continue →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({
  type,
  subMode,
  picks,
  recurringPreview,
  residencyPreview,
  residencyMeta,
  pricing,
}: {
  type: BookingType;
  subMode: BookSubMode;
  picks: SlotProposal[];
  recurringPreview: SlotProposal[];
  residencyPreview: SlotProposal[];
  residencyMeta: { daysOfWeek: number[]; sessionsPerWeek: 1 | 2; time: string };
  pricing: { perSession: number; residencySession: number };
}) {
  if (type === "BOOK_SESSIONS") {
    const list = subMode === "specific" ? picks : recurringPreview;
    return (
      <div className="rounded-lg bg-cream-100 p-5 space-y-3">
        <div className="flex justify-between">
          <span className="text-clay-mid text-sm">Type</span>
          <Badge variant="secondary">Book Sessions</Badge>
        </div>
        <div className="flex justify-between">
          <span className="text-clay-mid text-sm">Sessions</span>
          <span className="text-clay-dark">{list.length}</span>
        </div>
        <ul className="text-sm divide-y divide-terracotta-100">
          {list.map((s) => (
            <li key={s.start.toISOString()} className="flex justify-between py-1.5">
              <span className="text-clay-dark">{formatDate(s.start)}</span>
              <span className="text-clay-mid">
                {formatTime(s.start)} – {formatTime(s.end)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between pt-2 border-t border-terracotta-200">
          <span className="text-clay-mid text-sm">Due now</span>
          <span className="font-serif text-xl text-clay-dark">€0</span>
        </div>
        <p className="text-xs text-clay-mid">
          No payment now — you'll be reminded every 4 confirmed sessions
          ({formatPrice(pricing.perSession * 4)} per block).
        </p>
      </div>
    );
  }
  // Residency
  const total = residencyPreview.length * pricing.residencySession;
  return (
    <div className="rounded-lg bg-cream-100 p-5 space-y-3">
      <div className="flex justify-between">
        <span className="text-clay-mid text-sm">Type</span>
        <Badge variant="secondary">Residency</Badge>
      </div>
      <div className="flex justify-between">
        <span className="text-clay-mid text-sm">Days</span>
        <span className="text-clay-dark">
          {residencyMeta.daysOfWeek.length === 0
            ? "—"
            : residencyMeta.daysOfWeek
                .map((d) => DAY_NAMES[d])
                .join(", ")}{" "}
          at {residencyMeta.time}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-clay-mid text-sm">Per week</span>
        <span className="text-clay-dark">{residencyMeta.sessionsPerWeek}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-clay-mid text-sm">First month</span>
        <span className="text-clay-dark">{residencyPreview.length} sessions</span>
      </div>
      <div className="flex justify-between pt-2 border-t border-terracotta-200">
        <span className="text-clay-mid text-sm">Due now</span>
        <span className="font-serif text-xl text-clay-dark">
          {formatPrice(total)}
          <span className="text-xs text-clay-mid font-sans"> / first month</span>
        </span>
      </div>
    </div>
  );
}
