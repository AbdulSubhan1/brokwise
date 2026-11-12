import { Car, HeartPulse, House, type LucideIcon, Plane } from "lucide-react";

/** What the header, footer, home and 404 pages need of each line: no forms or schemas, so it stays light. */
export type LobMeta = { slug: string; name: string; title: string; tagline: string; icon: LucideIcon };

export const LOB_META = [
  {
    slug: "car",
    name: "Car",
    title: "Car insurance",
    tagline: "Comprehensive or third party, for the car you drive every day.",
    icon: Car,
  },
  {
    slug: "travel",
    name: "Travel",
    title: "Travel insurance",
    tagline: "Medical care, delays and cancellations, for one trip or a whole year.",
    icon: Plane,
  },
  {
    slug: "home",
    name: "Home",
    title: "Home insurance",
    tagline: "Your building and what is inside it, whether you own or rent.",
    icon: House,
  },
  {
    slug: "health",
    name: "Health",
    title: "Health insurance",
    tagline: "Doctors, hospitals and medicines, for you and your family.",
    icon: HeartPulse,
  },
] as const satisfies readonly LobMeta[];

export function metaOf(slug: (typeof LOB_META)[number]["slug"]): LobMeta {
  return LOB_META.find((m) => m.slug === slug)!;
}
