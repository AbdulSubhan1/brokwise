import { describe, expect, it } from "vitest";
import { contactOf, HELP_DESK } from "./contact";

const view = {
  opportunity: { publicId: "8d0f7c1e-2a4b-4c3d-9e8f-0a1b2c3d4e5f", status: "new" as const, product: "car" },
  lead: null,
  selection: null,
};

describe("contactOf", () => {
  it("shows the assigned coordinator", () => {
    const person = contactOf({
      ...view,
      contact: { role: "coordinator", name: "Sana Coordinator", email: "sana@policydesk.dev", phone: "+923001110004" },
    });
    expect(person).toEqual({
      badge: "Your coordinator",
      name: "Sana Coordinator",
      role: "Coordinator",
      email: "sana@policydesk.dev",
      phone: "+923001110004",
    });
  });

  it("shows the help desk when nobody is available", () => {
    expect(contactOf({ ...view, contact: null })).toEqual(HELP_DESK);
    expect(HELP_DESK).toMatchObject({
      name: "Brokwise help desk",
      email: "help@brokwise.test",
      phone: "+92 300 0000000",
    });
  });
});
