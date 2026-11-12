import { HeartPulse, User, UserRound, Users, UsersRound } from "lucide-react";
import { healthFullSchema, healthQuickSchema, LIMITS } from "@/lib/schemas";
import { detailsBuilder, THIS_YEAR, YES_NO } from "./build";
import type { FieldSpec, LobConfig } from "./types";

const coverFor: FieldSpec = {
  kind: "choice",
  name: "coverFor",
  label: "Who is covered?",
  options: [
    { value: "me", label: "Just me", icon: User },
    { value: "me_spouse", label: "Me and my spouse", icon: UsersRound },
    { value: "family", label: "My family", description: "With children", icon: Users },
  ],
};

export const health: LobConfig = {
  slug: "health",
  product: "health",
  name: "Health",
  title: "Health insurance",
  tagline: "Doctors, hospitals and medicines, for you and your family.",
  icon: HeartPulse,
  landing: {
    heading: "Cover for you and the people you love",
    intro: "Compare health plans for yourself, your spouse or your whole family, or ask a coordinator to call.",
    covered: [
      "Hospital stays and surgery",
      "Doctor visits and prescribed medicines",
      "A yearly wellness check-up on every plan",
      "Dental, optical and maternity as add-ons",
    ],
  },
  intros: {
    full: "Tell us who to cover and a little about you. It takes about 2 minutes.",
    quick: "Tell us who to cover and a coordinator will call you to find a plan.",
  },
  quickSection: { title: "Who is covered", icon: Users, fields: [coverFor] },
  fullSections: [
    {
      title: "Who is covered",
      icon: Users,
      fields: [
        coverFor,
        {
          kind: "select",
          name: "children",
          label: "Number of children",
          placeholder: "How many?",
          options: Array.from({ length: LIMITS.childrenMax + 1 }, (_, i) => ({ value: String(i), label: String(i) })),
          showWhen: { field: "coverFor", is: ["family"] },
        },
        { kind: "choice", name: "preExisting", label: "Does anyone have a pre-existing condition?", options: YES_NO },
      ],
    },
    {
      title: "About you",
      icon: UserRound,
      fields: [
        { kind: "name" },
        {
          kind: "date",
          name: "dateOfBirth",
          label: "Your date of birth",
          minYear: THIS_YEAR - LIMITS.healthAge.max - 1,
          maxYear: THIS_YEAR - LIMITS.healthAge.min,
          order: "desc",
        },
        { kind: "text", name: "city", label: "City", autoComplete: "address-level2" },
        { kind: "email" },
        { kind: "mobile" },
      ],
    },
  ],
  covers: [
    { value: "health_basic", label: "Basic" },
    { value: "health_enhanced", label: "Enhanced" },
    { value: "health_premium", label: "Premium" },
  ],
  bestValueCover: "health_premium",
  buildDetails: detailsBuilder({ short: healthQuickSchema, full: healthFullSchema }),
};
