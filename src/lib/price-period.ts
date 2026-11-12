/** What a plan's price pays for: a year of cover, or one trip. */
export type PricePeriod = "year" | "trip";

/** The label next to a plan's total, before payment. */
export const TOTAL_LABEL: Record<PricePeriod, string> = { year: "Total a year", trip: "Total for the trip" };

/** The label next to the total once it is paid. */
export const PAID_LABEL: Record<PricePeriod, string> = { year: "Total paid for the year", trip: "Total paid for the trip" };

/** A yearly price, for the lines whose plans all run a year. */
export const yearly = (): PricePeriod => "year";
