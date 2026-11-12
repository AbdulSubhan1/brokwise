import type { Contact } from "./policydesk";

/** Brokwise's help desk: shown instead of a person when PolicyDesk had nobody to assign, and in the footer. */
export const HELP_DESK = {
  name: "Brokwise help desk",
  email: "help@brokwise.test",
  phone: "+92 300 0000000",
} as const;

/**
 * Who the header contact card shows. `short` is what the badge shows on narrow screens (the first name). A person's
 * own email is their PolicyDesk login, so it never reaches the website: `emailHref` writes to the help desk inbox with
 * a subject that names the person and the quote, and the help desk passes it on (`viaHelpDesk`).
 */
export type ContactPerson = {
  name: string;
  short: string;
  role: string;
  phone: string;
  emailHref: string;
  viaHelpDesk: boolean;
};

const ROLES: Record<Contact["role"], string> = { coordinator: "Your coordinator", advisor: "Your advisor" };

function helpDeskEmail(subject?: string): string {
  return subject ? `mailto:${HELP_DESK.email}?subject=${encodeURIComponent(subject)}` : `mailto:${HELP_DESK.email}`;
}

type Source = {
  contact: Contact | null;
  lead?: { reference: string } | null;
  selection?: { quoteReference: string } | null;
};

/**
 * The person for the header card: the coordinator before payment (from the opportunity view), the advisor after it
 * (from the order view), or the help desk when nobody was assigned. `reference` goes in the email subject; by default
 * it is the view's quote reference once a plan is saved, else its lead reference.
 */
export function contactOf(
  { contact, lead, selection }: Source,
  reference = selection?.quoteReference ?? lead?.reference,
): ContactPerson {
  if (!contact) {
    return {
      name: HELP_DESK.name,
      short: "Help desk",
      role: "Here to help",
      phone: HELP_DESK.phone,
      emailHref: helpDeskEmail(reference),
      viaHelpDesk: false,
    };
  }
  const name = contact.name.trim();
  return {
    name,
    short: name.split(/\s+/)[0],
    role: ROLES[contact.role],
    phone: contact.phone,
    emailHref: helpDeskEmail(reference ? `For ${name}: ${reference}` : `For ${name}`),
    viaHelpDesk: true,
  };
}
