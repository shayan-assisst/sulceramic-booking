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

export function generateResidencySessions(
  weeklyDayOfWeek: number,
  weeklyTime: string, // "HH:mm"
  month: number, // 1-12
  year: number
) {
  const [hh, mm] = parseHHMM(weeklyTime);
  const sessions: { date: string; startTime: string; endTime: string }[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === weeklyDayOfWeek) {
      const start = new Date(d);
      start.setHours(hh, mm, 0, 0);
      const end = new Date(start);
      end.setMinutes(end.getMinutes() + SLOT_MINUTES);
      sessions.push({
        date: isoDate(start),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return sessions.slice(0, 4);
}
