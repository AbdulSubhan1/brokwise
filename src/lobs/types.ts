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
  covers: readonly Option[];
  /** The widest cover of the line: its cheapest plan is tagged "Best value". */
  bestValueCover: string;
  /** The form's raw values → PolicyDesk's request (contact and details), or the errors by field. */
  buildDetails(form: FormKind, values: FormValues): BuildResult;
};
