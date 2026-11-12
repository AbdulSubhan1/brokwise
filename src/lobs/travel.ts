import { Globe, Plane, Repeat, UserRound, Users } from "lucide-react";
import { LIMITS, travelFullSchema, travelQuickSchema } from "@/lib/schemas";
import { detailsBuilder, THIS_YEAR } from "./build";
import { metaOf } from "./meta";
import type { FieldSpec, LobConfig } from "./types";

export const TRAVEL_REGION_OPTIONS = [
  { value: "gcc", label: "GCC countries" },
  { value: "asia", label: "Asia" },
  { value: "europe_schengen", label: "Europe (Schengen)" },
  { value: "worldwide_ex_us", label: "Worldwide, excluding the US and Canada" },
  { value: "worldwide", label: "Worldwide" },
] as const;

const destination: FieldSpec = {
  kind: "select",
  name: "destination",
  label: "Where are you going?",
  placeholder: "Choose a region",
  options: TRAVEL_REGION_OPTIONS,
};

const tripDate = (name: string, label: string): FieldSpec => ({
  kind: "date",
  name,
  label,
  minYear: THIS_YEAR,
  maxYear: THIS_YEAR + 1,
  order: "asc",
});

const counts = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: String(from + i) }));

export const travel: LobConfig = {
  ...metaOf("travel"),
  product: "travel",
  landing: {
    heading: "Cover for the trip ahead",
    intro: "One trip or a year of them: compare plans for where you are going, or ask a coordinator to call.",
    covered: [
      "Emergency medical care and evacuation abroad",
      "Lost, stolen or delayed baggage",
      "Trip cancellation and missed connections as add-ons",
      "Schengen visa cover for Europe",
    ],
  },
  intros: {
    full: "Tell us about your trip and who is travelling. It takes about 2 minutes.",
    quick: "Tell us where you are going and a coordinator will call you to find a plan.",
  },
  quickSection: { title: "Your trip", icon: Globe, fields: [destination] },
  fullSections: [
    {
      title: "Your trip",
      icon: Globe,
      fields: [
        destination,
        {
          kind: "choice",
          name: "tripType",
          label: "Trip type",
          options: [
            { value: "single", label: "Single trip", description: "One trip, up to 180 days", icon: Plane },
            { value: "annual", label: "Annual plan", description: "Every trip for a year", icon: Repeat },
          ],
        },
        tripDate("startDate", "Start date"),
        { ...tripDate("endDate", "End date"), showWhen: { field: "tripType", is: ["single"] } },
      ],
    },
    {
      title: "Who is travelling",
      icon: Users,
      fields: [
        {
          kind: "select",
          name: "travellers",
          label: "Travellers",
          required: "Choose how many people are travelling.",
          placeholder: "How many?",
          options: counts(LIMITS.travellers.min, LIMITS.travellers.max),
        },
        {
          kind: "text",
          name: "oldestAge",
          label: "Oldest traveller's age",
          inputMode: "numeric",
          hint: "In years. Use 0 for a baby.",
        },
      ],
    },
    { title: "About you", icon: UserRound, fields: [{ kind: "name" }, { kind: "email" }, { kind: "mobile" }] },
  ],
  covers: [
    { value: "single_trip", label: "Single trip", period: "trip" },
    { value: "annual_multi_trip", label: "Annual multi-trip" },
    // Schengen plans cover the one trip a visa is for.
    { value: "schengen", label: "Schengen", period: "trip" },
  ],
  bestValueCover: "annual_multi_trip",
  buildDetails: detailsBuilder({ short: travelQuickSchema, full: travelFullSchema }),
};
