import { CONTACT_FIELDS } from "@/lib/schemas";
import { car } from "./car";
import { dateFields, sectionFields } from "./build";
import { health } from "./health";
import { home } from "./home";
import { travel } from "./travel";
import type { FormKind, LobConfig } from "./types";

export type { FieldSpec, FormKind, FormSectionSpec, LobConfig } from "./types";

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
