import { CONTACT_FIELDS, REQUIRED } from "@/lib/schemas";
import { car } from "./car";
import { dateFields, type FieldLabel, labelsOf, sectionFields } from "./build";
import { health } from "./health";
import { home } from "./home";
import { travel } from "./travel";
import type { FormKind, LobConfig, PricePeriod } from "./types";

export { type FieldLabel, labelsOf } from "./build";
export type { FieldSpec, FormKind, FormSectionSpec, LobConfig, PricePeriod } from "./types";

// The lines of business Brokwise sells, in menu order. Adding a line is one config file here plus PolicyDesk's
// product schema: the pages under src/app/[lob] are shared.
export const LOBS = [car, travel, home, health] as const satisfies readonly LobConfig[];

export const LOB_SLUGS = LOBS.map((l) => l.slug);

export function getLob(slug: string): LobConfig | null {
  return LOBS.find((l) => l.slug === slug) ?? null;
}

/** The line that sells a PolicyDesk product, or null for a product the website doesn't sell. */
export function lobForProduct(product: string): LobConfig | null {
  return LOBS.find((l) => l.product === product) ?? null;
}

/** The sections a form shows: the quick form asks for the contact first, then its own section. */
export function formSections(lob: LobConfig, form: FormKind) {
  if (form === "full") return lob.fullSections;
  return [
    {
      title: "About you",
      icon: lob.fullSections.at(-1)!.icon,
      fields: [{ kind: "name" }, { kind: "email" }, { kind: "mobile" }],
    },
    lob.quickSection,
  ] as const satisfies LobConfig["fullSections"];
}

/** Every field name a form sends, contact included. */
export function formFields(lob: LobConfig, form: FormKind): string[] {
  return [...new Set([...CONTACT_FIELDS, ...sectionFields(formSections(lob, form))])];
}

export function formDateFields(lob: LobConfig, form: FormKind): string[] {
  return dateFields(formSections(lob, form));
}

/** Every field a form sends, with its label and summary link, in the order the form shows them. */
export function formLabels(lob: LobConfig, form: FormKind): FieldLabel[] {
  return formSections(lob, form).flatMap((s) => s.fields.flatMap(labelsOf));
}

/** The errors with each generic "required" message replaced by the field's own ("Enter your date of birth."). */
export function withFieldMessages(
  lob: LobConfig,
  form: FormKind,
  errors: Record<string, string>,
): Record<string, string> {
  const labels = new Map(formLabels(lob, form).map((l) => [l.name, l]));
  return Object.fromEntries(
    Object.entries(errors).map(([field, message]) => [
      field,
      message === REQUIRED ? (labels.get(field)?.required ?? message) : message,
    ]),
  );
}

/** How long a plan of this cover is priced for; a cover the config doesn't list is priced for a year. */
export function periodOf(lob: LobConfig, cover: string): PricePeriod {
  return lob.covers.find((c) => c.value === cover)?.period ?? "year";
}

const PERIOD_WORDS: Record<PricePeriod, { total: string; price: string; note: string }> = {
  year: { total: "Total a year", price: "a year", note: "Prices are yearly, in US dollars." },
  trip: { total: "Total for this trip", price: "for this trip", note: "Prices are for the whole trip, in US dollars." },
};

/** The words for a cover's price: the total's label ("Total a year") and what follows a price ("for this trip"). */
export function priceWords(lob: LobConfig, cover: string): { total: string; price: string } {
  const { total, price } = PERIOD_WORDS[periodOf(lob, cover)];
  return { total, price };
}

/** The plans page's line about prices: for the chosen cover, or for every cover of the line when none is chosen. */
export function pricesNote(lob: LobConfig, cover = ""): string {
  const periods = new Set((cover ? [cover] : lob.covers.map((c) => c.value)).map((c) => periodOf(lob, c)));
  if (periods.size > 1) return "Prices are in US dollars, for a year or for the whole trip as each plan says.";
  return PERIOD_WORDS[[...periods][0] ?? "year"].note;
}
