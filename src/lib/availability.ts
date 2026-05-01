// Availability + slot generation helpers.
// Slots are derived from recurring patterns (per day of week) plus exceptions.

export type RecurringPattern = {
  daysOfWeek: number[]; // 0=Sun..6=Sat
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

export type AvailabilityRule = {
  id: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern | null;
  startTime?: Date | null;
  endTime?: Date | null;
  exceptions?: string[]; // ISO date strings yyyy-mm-dd that are blocked
};

export type SlotProposal = {
  date: string; // yyyy-mm-dd
  start: Date;
  end: Date;
};

const SLOT_MINUTES = 120; // 2-hour sessions

function parseHHMM(s: string): [number, number] {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return [h || 0, m || 0];
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function generateSlotsForRange(
  rules: AvailabilityRule[],
  from: Date,
  to: Date
): SlotProposal[] {
  const out: SlotProposal[] = [];
  const day = new Date(from);
  day.setHours(0, 0, 0, 0);
  const last = new Date(to);
  last.setHours(0, 0, 0, 0);
  while (day <= last) {
    const dow = day.getDay();
    const dateStr = isoDate(day);

    for (const rule of rules) {
      const exceptions = rule.exceptions ?? [];
      if (exceptions.includes(dateStr)) continue;

      if (rule.isRecurring && rule.recurringPattern) {
        const p = rule.recurringPattern;
        if (!p.daysOfWeek.includes(dow)) continue;
        const [sh, sm] = parseHHMM(p.startTime);
        const [eh, em] = parseHHMM(p.endTime);
        const start = new Date(day);
        start.setHours(sh, sm, 0, 0);
        const end = new Date(day);
        end.setHours(eh, em, 0, 0);
        // Generate 2-hour slots within range
        const cursor = new Date(start);
        while (cursor.getTime() + SLOT_MINUTES * 60_000 <= end.getTime()) {
          const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60_000);
          out.push({ date: dateStr, start: new Date(cursor), end: slotEnd });
          cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
        }
      } else if (rule.startTime && rule.endTime) {
        const startDate = new Date(rule.startTime);
        const endDate = new Date(rule.endTime);
        if (
          startDate.getFullYear() === day.getFullYear() &&
          startDate.getMonth() === day.getMonth() &&
          startDate.getDate() === day.getDate()
        ) {
          out.push({ date: dateStr, start: startDate, end: endDate });
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return out;
}

// Generate N future sessions matching a recurring pattern (used by Book Sessions).
export function generateRecurringSessions(
  daysOfWeek: number[],
  time: string,
  count: number,
  from: Date = new Date()
): SlotProposal[] {
  if (daysOfWeek.length === 0 || count <= 0) return [];
  const [hh, mm] = parseHHMM(time);
  const out: SlotProposal[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  // Move cursor forward to the next matching day (allow today if time is later).
  let safety = 0;
  while (out.length < count && safety < 366 * 2) {
    safety += 1;
    if (daysOfWeek.includes(cursor.getDay())) {
      const start = new Date(cursor);
      start.setHours(hh, mm, 0, 0);
      if (start.getTime() > Date.now()) {
        const end = new Date(start.getTime() + SLOT_MINUTES * 60_000);
        out.push({ date: isoDate(start), start, end });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Generate residency sessions for the first month from a multi-day pattern.
export function generateResidencySessionsFromPattern(opts: {
  daysOfWeek: number[];
  time: string; // "HH:mm"
  sessionsPerWeek: number; // 1 or 2
  startDate: Date;
}) {
  const { daysOfWeek, time, sessionsPerWeek, startDate } = opts;
  if (daysOfWeek.length === 0) return [];
  const [hh, mm] = parseHHMM(time);

  // Iterate from startDate for ~28 days, picking up to sessionsPerWeek per ISO week.
  const sessions: { date: string; startTime: string; endTime: string }[] = [];
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(cursor);
  end.setDate(end.getDate() + 28);

  // Group by week: track count per week-of-year key.
  const perWeek = new Map<string, number>();
  function weekKey(d: Date) {
    // Use yyyy-Www where W = floor(((day - firstDow + 7)/7))
    const tmp = new Date(d);
    tmp.setHours(0, 0, 0, 0);
    const yearStart = new Date(tmp.getFullYear(), 0, 1);
    const diff = Math.floor(
      (tmp.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000)
    );
    const w = Math.floor((diff + yearStart.getDay()) / 7);
    return `${tmp.getFullYear()}-W${w}`;
  }

  while (cursor < end) {
    if (daysOfWeek.includes(cursor.getDay())) {
      const key = weekKey(cursor);
      const used = perWeek.get(key) ?? 0;
      if (used < sessionsPerWeek) {
        const s = new Date(cursor);
        s.setHours(hh, mm, 0, 0);
        const e = new Date(s.getTime() + SLOT_MINUTES * 60_000);
        sessions.push({
          date: isoDate(s),
          startTime: s.toISOString(),
          endTime: e.toISOString(),
        });
        perWeek.set(key, used + 1);
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}
