import type { Contact } from "./policydesk";

/** Who the header contact card shows. */
export type ContactPerson = { badge: string; name: string; role?: string; email: string; phone: string };

/** Shown instead of a person when PolicyDesk had nobody available to assign. */
export const HELP_DESK: ContactPerson = {
  badge: "Help desk",
  name: "Brokwise help desk",
  email: "help@brokwise.test",
  phone: "+92 300 0000000",
};

const ROLES: Record<Contact["role"], { badge: string; role: string }> = {
  coordinator: { badge: "Your coordinator", role: "Coordinator" },
  advisor: { badge: "Your advisor", role: "Advisor" },
};

/**
 * The person for the header card: the coordinator before payment (from the opportunity view), the advisor after it
 * (from the order view), or the help desk when nobody was assigned.
 */
export function contactOf({ contact }: { contact: Contact | null }): ContactPerson {
  if (!contact) return HELP_DESK;
  const { badge, role } = ROLES[contact.role];
  return { badge, name: contact.name, role, email: contact.email, phone: contact.phone };
}
