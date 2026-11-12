import { Car, Mail, UserRound } from "lucide-react";
import { carFullSchema, carQuickSchema, LIMITS } from "@/lib/schemas";
import { detailsBuilder, THIS_YEAR, YES_NO } from "./build";
import type { LobConfig } from "./types";

export const car: LobConfig = {
  slug: "car",
  product: "car",
  name: "Car",
  title: "Car insurance",
  tagline: "Comprehensive or third party, for the car you drive every day.",
  icon: Car,
  landing: {
    heading: "Cover for the car you drive",
    intro: "Compare plans from our partner insurers, or let a coordinator find one with you.",
    covered: [
      "Damage to your car from an accident, fire or theft",
      "Damage you cause to other people's cars and property",
      "Roadside help and a replacement car as add-ons",
      "Repairs at a partner garage or at the agency",
    ],
  },
  intros: {
    full: "Tell us about your car and the driver. It takes about 3 minutes.",
    quick: "Leave a few details and a coordinator will call you to find a plan.",
  },
  quickSection: { title: "Your car", icon: Car, fields: [{ kind: "car" }] },
  fullSections: [
    {
      title: "Your car",
      icon: Car,
      fields: [
        { kind: "car" },
        { kind: "choice", name: "gccSpec", label: "Is the car GCC spec?", options: YES_NO },
        {
          kind: "text",
          name: "carValue",
          label: "Car value (USD)",
          inputMode: "numeric",
          placeholder: "18000",
          hint: "What the car is worth today, in whole dollars.",
        },
      ],
    },
    {
      title: "The driver",
      icon: UserRound,
      fields: [
        { kind: "name" },
        {
          kind: "date",
          name: "dateOfBirth",
          label: "Date of birth",
          minYear: THIS_YEAR - LIMITS.driverAge.max - 1,
          maxYear: THIS_YEAR - LIMITS.driverAge.min,
          order: "desc",
        },
        { kind: "text", name: "nationality", label: "Nationality" },
        { kind: "text", name: "city", label: "City", autoComplete: "address-level2" },
        { kind: "text", name: "yearsLicensed", label: "Years with a driving licence", inputMode: "numeric" },
      ],
    },
    { title: "How we reach you", icon: Mail, fields: [{ kind: "email" }, { kind: "mobile" }] },
  ],
  covers: [
    { value: "third_party", label: "Third party" },
    { value: "comprehensive", label: "Comprehensive" },
    { value: "comprehensive_agency", label: "Agency repair" },
  ],
  bestValueCover: "comprehensive",
  buildDetails: detailsBuilder({ short: carQuickSchema, full: carFullSchema }),
};
