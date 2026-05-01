"use client";
import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toaster";
import { cn, DAY_NAMES_SHORT, DAY_NAMES, formatDate } from "@/lib/utils";
import type { AvailabilityRule } from "@/lib/availability";
import { generateSlotsForRange } from "@/lib/availability";

type Rule = AvailabilityRule;

export function AvailabilityEditor({
  initial,
  isDemo,
}: {
  initial: Rule[];
  isDemo?: boolean;
}) {
  const [rules, setRules] = React.useState<Rule[]>(initial);
  const [draft, setDraft] = React.useState<{
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  }>({ daysOfWeek: [1, 3, 5], startTime: "10:00", endTime: "20:00" });
  const [exceptionDate, setExceptionDate] = React.useState("");
  const { toast } = useToast();

  function toggleDay(d: number) {
    setDraft((s) => ({
      ...s,
      daysOfWeek: s.daysOfWeek.includes(d)
        ? s.daysOfWeek.filter((x) => x !== d)
        : [...s.daysOfWeek, d].sort(),
    }));
  }

  async function addRecurring() {
    const body = {
      isRecurring: true,
      recurringPattern: draft,
    };
    if (isDemo) {
      const id = "demo-" + Math.random().toString(36).slice(2, 8);
      setRules((r) => [...r, { id, ...body, exceptions: [] }]);
      toast("Demo mode — saved locally only.", "info");
      return;
    }
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      toast("Could not save", "error");
      return;
    }
    const d = await res.json();
    setRules((r) => [...r, d.rule]);
    toast("Slot added", "success");
  }

  async function deleteRule(id: string) {
    if (isDemo) {
      setRules((r) => r.filter((x) => x.id !== id));
      toast("Demo mode — removed locally.", "info");
      return;
    }
    if (!confirm("Delete this availability rule?")) return;
    const res = await fetch(`/api/availability/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Could not delete", "error");
      return;
    }
    setRules((r) => r.filter((x) => x.id !== id));
    toast("Removed", "success");
  }

  async function addException(ruleId: string) {
    if (!exceptionDate) return;
    if (isDemo) {
      setRules((r) =>
        r.map((rule) =>
          rule.id === ruleId
            ? { ...rule, exceptions: [...(rule.exceptions ?? []), exceptionDate] }
            : rule
        )
      );
      setExceptionDate("");
      toast("Demo mode — exception saved locally.", "info");
      return;
    }
    const res = await fetch(`/api/availability/${ruleId}/exception`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: exceptionDate }),
    });
    if (!res.ok) {
      toast("Could not save exception", "error");
      return;
    }
    const d = await res.json();
    setRules((r) => r.map((rule) => (rule.id === ruleId ? d.rule : rule)));
    setExceptionDate("");
    toast("Exception added", "success");
  }

  // Calendar preview: next 4 weeks of generated slots
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + 28);
  const slots = generateSlotsForRange(rules, today, horizon);
  const slotsByDate = new Map<string, number>();
  for (const s of slots) {
    slotsByDate.set(s.date, (slotsByDate.get(s.date) ?? 0) + 1);
  }

  // Render a 4-week calendar grid starting today's week
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const cells: { date: Date; count: number; iso: string }[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ date: d, count: slotsByDate.get(iso) ?? 0, iso });
  }

  return (
    <div className="grid md:grid-cols-[1fr_360px] gap-6">
      {/* Calendar preview */}
      <Card>
        <CardHeader>
          <CardTitle>Next 4 weeks</CardTitle>
          <CardDescription>
            Preview of slots generated from your availability rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-xs uppercase tracking-wider text-clay-mid mb-1">
            {DAY_NAMES_SHORT.map((d) => (
              <div key={d} className="text-center py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              const isPast = c.date < today;
              return (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-md border p-1 flex flex-col text-xs",
                    isPast
                      ? "bg-cream-100/50 border-cream-200 text-clay-mid"
                      : c.count > 0
                      ? "bg-terracotta-50 border-terracotta-200 text-clay-dark"
                      : "bg-card border-cream-200 text-clay-mid"
                  )}
                >
                  <div className="font-medium">{c.date.getDate()}</div>
                  {c.count > 0 && !isPast && (
                    <div className="mt-auto text-[10px] text-terracotta-700">
                      {c.count} slot{c.count > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Add recurring availability</CardTitle>
            <CardDescription>
              Pick days of the week and a time range. Sessions are 2h each.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {DAY_NAMES_SHORT.map((d, i) => (
                <button
                  key={d}
                  onClick={() => toggleDay(i)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm border transition-colors",
                    draft.daysOfWeek.includes(i)
                      ? "border-terracotta-500 bg-terracotta-100 text-clay-dark"
                      : "border-terracotta-200 text-clay-mid hover:border-terracotta-300"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={draft.startTime}
                  onChange={(e) => setDraft({ ...draft, startTime: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Input
                  type="time"
                  value={draft.endTime}
                  onChange={(e) => setDraft({ ...draft, endTime: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={addRecurring} className="w-full">
              Add recurring rule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rules.length === 0 && (
              <p className="text-sm text-clay-mid">No rules yet — add one above.</p>
            )}
            {rules.map((r) => (
              <div
                key={r.id}
                className="rounded-md border border-terracotta-100 bg-cream-50 p-3"
              >
                <div className="flex items-center justify-between">
                  <div>
                    {r.isRecurring && r.recurringPattern ? (
                      <>
                        <div className="text-sm text-clay-dark">
                          {r.recurringPattern.daysOfWeek
                            .map((d) => DAY_NAMES[d])
                            .join(", ")}
                        </div>
                        <div className="text-xs text-clay-mid">
                          {r.recurringPattern.startTime} – {r.recurringPattern.endTime}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-clay-dark">One-off slot</div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteRule(r.id)}>
                    Remove
                  </Button>
                </div>
                {r.exceptions && r.exceptions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.exceptions.map((e) => (
                      <Badge key={e} variant="muted">
                        Block {formatDate(e + "T00:00:00")}
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-2 items-center">
                  <Input
                    type="date"
                    value={exceptionDate}
                    onChange={(e) => setExceptionDate(e.target.value)}
                    className="h-9"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addException(r.id)}
                    disabled={!exceptionDate}
                  >
                    Block date
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
