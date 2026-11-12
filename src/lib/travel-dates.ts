// The travel form's date rules, the same as PolicyDesk's: a trip starts today or later; a single trip ends on or after
// its start and lasts at most 180 days; an annual plan covers a year of trips, so it has no end date.
// Dates are ISO days compared as text, with "today" in UTC as PolicyDesk has it.

export const TRIP_DAYS_MAX = 180;
const DAY_MS = 86_400_000;

const REQUIRED = "This field is required.";

export type TravelDates = { tripType: string; startDate: string; endDate: string };
export type DateIssue = { field: "startDate" | "endDate"; message: string };

export const todayIso = () => new Date().toISOString().slice(0, 10);

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);

/** The date mistakes in a travel form whose dates are already valid ISO days (or empty). */
export function travelDateIssues({ tripType, startDate, endDate }: TravelDates, today = todayIso()): DateIssue[] {
  const issues: DateIssue[] = [];
  if (startDate && startDate < today) issues.push({ field: "startDate", message: "The trip can't start in the past." });
  if (tripType === "annual") {
    if (endDate) issues.push({ field: "endDate", message: "An annual plan has no end date. Leave it empty." });
  } else if (tripType === "single") {
    if (!endDate) issues.push({ field: "endDate", message: REQUIRED });
    else if (startDate && endDate < startDate) {
      issues.push({ field: "endDate", message: "The trip must end on or after its start date." });
    } else if (startDate && daysBetween(startDate, endDate) > TRIP_DAYS_MAX) {
      issues.push({ field: "endDate", message: `A single trip can be up to ${TRIP_DAYS_MAX} days.` });
    }
  }
  return issues;
}
