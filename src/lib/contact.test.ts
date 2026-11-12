import { describe, expect, it } from "vitest";
import { contactOf, HELP_DESK } from "./contact";

const view = {
  opportunity: { publicId: "8d0f7c1e-2a4b-4c3d-9e8f-0a1b2c3d4e5f", status: "new" as const, product: "car" },
  lead: null,
  selection: null,
};

const hina = { role: "coordinator", name: "Hina Malik", email: "hina@policydesk.dev", phone: "+923001110004" } as const;

describe("contactOf", () => {
  it("shows the assigned coordinator by name, with email through the help desk", () => {
    const person = contactOf({ ...view, contact: hina });
    expect(person).toEqual({
      name: "Hina Malik",
      short: "Hina",
      role: "Your coordinator",
      phone: "+923001110004",
      emailHref: "mailto:help@brokwise.test?subject=For%20Hina%20Malik",
      viaHelpDesk: true,
    });
  });

  it("never shows the person's own (CRM login) email", () => {
    expect(JSON.stringify(contactOf({ ...view, contact: hina }))).not.toContain("policydesk.dev");
  });

  it("puts the lead reference in the subject, and the quote reference once a plan is saved", () => {
    const lead = { reference: "CAR-7KQ2M9X" };
    expect(contactOf({ ...view, lead, contact: hina }).emailHref).toBe(
      "mailto:help@brokwise.test?subject=For%20Hina%20Malik%3A%20CAR-7KQ2M9X",
    );
    const selection = { quoteReference: "CAR-7KQ2M9X-Q2" };
    expect(contactOf({ ...view, lead, selection, contact: hina }).emailHref).toBe(
      "mailto:help@brokwise.test?subject=For%20Hina%20Malik%3A%20CAR-7KQ2M9X-Q2",
    );
  });

  it("shows the advisor assigned after payment, with the order's reference", () => {
    const person = contactOf(
      { contact: { role: "advisor", name: "Saad Raza", email: "saad@policydesk.dev", phone: "+923001110006" } },
      "CAR-7KQ2M9X-Q2",
    );
    expect(person).toEqual({
      name: "Saad Raza",
      short: "Saad",
      role: "Your advisor",
      phone: "+923001110006",
      emailHref: "mailto:help@brokwise.test?subject=For%20Saad%20Raza%3A%20CAR-7KQ2M9X-Q2",
      viaHelpDesk: true,
    });
  });

  it("shows the help desk when nobody is available", () => {
    expect(contactOf({ ...view, contact: null })).toEqual({
      name: "Brokwise help desk",
      short: "Help desk",
      role: "Here to help",
      phone: "+92 300 0000000",
      emailHref: "mailto:help@brokwise.test",
      viaHelpDesk: false,
    });
    expect(contactOf({ ...view, lead: { reference: "CAR-7KQ2M9X" }, contact: null }).emailHref).toBe(
      "mailto:help@brokwise.test?subject=CAR-7KQ2M9X",
    );
    expect(HELP_DESK).toEqual({ name: "Brokwise help desk", email: "help@brokwise.test", phone: "+92 300 0000000" });
  });
});
