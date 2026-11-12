import type { LucideIcon } from "lucide-react";
import type { RadioCardOption } from "@/components/ui/radio-cards";
import type { Option } from "@/components/ui/select";
import type { FormValues } from "@/lib/form-state";
import type { LeadRequest, WebsiteProduct } from "@/lib/policydesk";

export type FormKind = "short" | "full";

/** Show a field only while another field (a choice above it) has one of these values. */
export type ShowWhen = { field: string; is: readonly string[] };

/**
 * One control of a form, as the generic form renders it. `required` replaces the "required" message the label gives
 * ("Enter your city."), for a label that doesn't read well in it.
 */
export type FieldSpec = { showWhen?: ShowWhen } & (
  | {
      kind: "text";
      name: string;
      label: string;
      required?: string;
      hint?: string;
      placeholder?: string;
      inputMode?: "numeric" | "text";
      autoComplete?: string;
      suffix?: string;
    }
  | {
      kind: "select";
      name: string;
      label: string;
      required?: string;
      placeholder: string;
      options: readonly Option[];
      hint?: string;
    }
  | { kind: "choice"; name: string; label: string; options: readonly RadioCardOption[] }
  | { kind: "date"; name: string; label: string; minYear: number; maxYear: number; order: "asc" | "desc"; hint?: string }
  // Make, model (filtered by make) and model year.
  | { kind: "car" }
  | { kind: "name" }
  | { kind: "email" }
  | { kind: "mobile" }
);

/** How long a plan's price runs: a year, or the one trip it covers. */
export type PricePeriod = "year" | "trip";

/**
 * A cover of the plans filter. A price is for a year unless the cover says `period: "trip"`. A cover `within` another
 * is a narrower kind of it (agency repair is comprehensive cover): the filter counts it under that cover and offers a
 * "`only`" checkbox for it instead of a tab of its own.
 */
export type CoverSpec = Option & { period?: PricePeriod; within?: string; only?: string };

/**
 * What the plans page's summary says was quoted, from the full form's answers: a title ("Toyota Corolla 2021"), the
 * other answers that set the price ("worth $18,000", "driver 34"), and who or what the plans are for ("your Corolla").
 * An answer the visitor didn't give is left out.
 */
export type QuoteSummary = { title: string; facts: string[]; forWhom: string };

export type FormSectionSpec = { title: string; icon: LucideIcon; fields: readonly FieldSpec[] };

export type BuildResult =
  | { ok: true; request: LeadRequest }
  | { ok: false; errors: Record<string, string> };

/** Everything that makes one line of business: its words, its forms and how a form becomes PolicyDesk's details. */
export type LobConfig = {
  slug: string;
  /** PolicyDesk's product key. */
  product: WebsiteProduct;
  /** "Travel" */
  name: string;
  /** "Travel insurance" */
  title: string;
  /** One line for the home page card and the menu. */
  tagline: string;
  icon: LucideIcon;
  /** The line's landing page. */
  landing: { heading: string; intro: string; covered: readonly string[] };
  /** What the full and quick forms say under their headings. */
  intros: { full: string; quick: string };
  /** The quick form's own section (the contact section comes first). */
  quickSection: FormSectionSpec;
  fullSections: readonly FormSectionSpec[];
  /** The cover filter on the plans page; values are PolicyDesk's cover keys. */
  covers: readonly CoverSpec[];
  /** The widest cover of the line: its cheapest plan is tagged "Best value". */
  bestValueCover: string;
  /** Who the plans are for when the answers aren't known ("your car"). */
  forWhom: string;
  /** The full form's answers → the plans page's summary. `today` is an ISO day, for ages. */
  summary(values: FormValues, today: string): QuoteSummary;
  /** The form's raw values → PolicyDesk's request (contact and details), or the errors by field. */
  buildDetails(form: FormKind, values: FormValues): BuildResult;
};
