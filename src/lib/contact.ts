import type { OpportunityView } from "./policydesk";

/** Who the header contact card shows. */
export type ContactPerson = { badge: string; name: string; role?: string; email: string; phone: string };

/** Shown instead of a person when PolicyDesk had nobody available to assign. */
export const HELP_DESK: ContactPerson = {
  badge: "Help desk",
  name: "Brokwise help desk",
  email: "help@brokwise.test",
  phone: "+92 300 0000000",
};

export function contactOf(view: OpportunityView): ContactPerson {
  if (!view.contact) return HELP_DESK;
  return {
    badge: "Your coordinator",
    name: view.contact.name,
    role: "Coordinator",
    email: view.contact.email,
    phone: view.contact.phone,
  };
}
