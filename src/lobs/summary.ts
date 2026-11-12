import { formatUsd } from "@/lib/money";
import type { Option } from "@/components/ui/select";

// Small pieces the lines' quote summaries share. Each returns undefined for an answer that isn't there (or isn't what
// the form sends), so a summary just leaves it out.

/** Whole years from an ISO birth date to an ISO day: "1990-03-21" on "2026-11-12" → 36. */
export function ageOn(birthIso: string | undefined, todayIso: string): number | undefined {
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthIso ?? "");
  const today = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayIso);
  if (!birth || !today) return undefined;
  const beforeBirthday = today[2] + today[3] < birth[2] + birth[3];
  const age = Number(today[1]) - Number(birth[1]) - (beforeBirthday ? 1 : 0);
  return age >= 0 ? age : undefined;
}

/** "18000" → "$18,000". */
export function usdOf(value: string | undefined): string | undefined {
  return value && /^\d+$/.test(value) ? formatUsd(Number(value)) : undefined;
}

/** "2", "traveller" → "2 travellers"; "1" → "1 traveller". */
export function countOf(value: string | undefined, one: string, many = `${one}s`): string | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  return `${value} ${Number(value) === 1 ? one : many}`;
}

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-12-05" → "5 Dec 2026". */
export function dayOf(iso: string | undefined): string | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : DAY.format(date);
}

/** The label of a choice's value, from the options the form showed. */
export function labelOf(options: readonly Option[], value: string | undefined): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

/** The facts that are there. */
export function present(...facts: (string | false | undefined)[]): string[] {
  return facts.filter((f): f is string => typeof f === "string" && f.length > 0);
}
