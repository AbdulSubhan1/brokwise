import { Building, Building2, House, KeyRound, UserRound, Warehouse } from "lucide-react";
import { homeFullSchema, homeQuickSchema } from "@/lib/schemas";
import { detailsBuilder } from "./build";
import { metaOf } from "./meta";
import { labelOf, present, usdOf } from "./summary";
import type { FieldSpec, LobConfig } from "./types";

const city: FieldSpec = { kind: "text", name: "city", label: "City", autoComplete: "address-level2" };

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment", icon: Building2 },
  { value: "villa", label: "Villa", icon: House },
  { value: "townhouse", label: "Townhouse", icon: Building },
] as const;

export const home: LobConfig = {
  ...metaOf("home"),
  product: "home",
  landing: {
    heading: "Cover for the place you live",
    intro: "Owners insure the building and its contents; tenants insure what they own inside.",
    covered: [
      "Fire, flood, storm and burst pipes",
      "Theft and break-ins",
      "A place to stay while your home is repaired: included with building and contents, an add-on otherwise",
      "Accidental damage and valuables away from home as add-ons",
    ],
  },
  intros: {
    full: "Tell us about your home and what is in it. Your answers set the price. It takes about 2 minutes.",
    quick: "Tell us your city and a coordinator will call you to find a plan.",
  },
  quickSection: { title: "Your home", icon: House, fields: [city] },
  fullSections: [
    {
      title: "Your home",
      icon: House,
      fields: [
        {
          kind: "choice",
          name: "propertyType",
          label: "Property type",
          options: PROPERTY_TYPES,
        },
        {
          kind: "choice",
          name: "occupancy",
          label: "You are the",
          options: [
            { value: "owner", label: "Owner", description: "Building and contents", icon: KeyRound },
            { value: "tenant", label: "Tenant", description: "Contents only", icon: Warehouse },
          ],
        },
        city,
        {
          kind: "text",
          name: "buildingValue",
          label: "Building value (USD)",
          inputMode: "numeric",
          placeholder: "250000",
          hint: "What it would cost to rebuild, 10,000 to 5,000,000.",
          showWhen: { field: "occupancy", is: ["owner"] },
        },
        {
          kind: "text",
          name: "contentsValue",
          label: "Contents value (USD)",
          inputMode: "numeric",
          placeholder: "20000",
          hint: "Furniture, electronics and belongings, 1,000 to 500,000.",
        },
      ],
    },
    { title: "About you", icon: UserRound, fields: [{ kind: "name" }, { kind: "email" }, { kind: "mobile" }] },
  ],
  covers: [
    { value: "building", label: "Building" },
    { value: "contents", label: "Contents" },
    { value: "building_contents", label: "Building and contents" },
  ],
  bestValueCover: "building_contents",
  forWhom: "your home",
  summary: (v) => {
    const type = labelOf(PROPERTY_TYPES, v.propertyType);
    return {
      title: present(type ?? "Your home", v.city && `in ${v.city}`).join(" "),
      facts: present(
        v.occupancy === "owner" && "owner",
        v.occupancy === "tenant" && "tenant",
        usdOf(v.buildingValue) && `building ${usdOf(v.buildingValue)}`,
        usdOf(v.contentsValue) && `contents ${usdOf(v.contentsValue)}`,
      ),
      forWhom: type ? `your ${type.toLowerCase()}` : "your home",
    };
  },
  buildDetails: detailsBuilder({ short: homeQuickSchema, full: homeFullSchema }),
};
