// The DateField's rules: three selects (day, month, year) make one ISO date, or nothing until all three are picked and
// the day exists in that month.

export type DateParts = { day: string; month: string; year: string };

const EMPTY: DateParts = { day: "", month: "", year: "" };

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Days in a month (1–12) of a year, leap years included. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** "15", "11", "1995" → "1995-11-15"; "" when a part is missing or the day does not exist (31 February). */
export function isoFromParts(day: string, month: string, year: string): string {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return "";
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** A saved ISO value back into the three selects; empty parts for anything else. */
export function partsFromIso(iso: string | undefined): DateParts {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!match) return EMPTY;
  return { year: match[1], month: String(Number(match[2])), day: String(Number(match[3])) };
}

/** The years a field offers, from min to max: newest first for dates of birth, oldest first for trip dates. */
export function yearOptions(min: number, max: number, order: "asc" | "desc"): number[] {
  const years = Array.from({ length: Math.max(0, max - min + 1) }, (_, i) => min + i);
  return order === "asc" ? years : years.reverse();
}
