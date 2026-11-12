import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { textLink } from "@/components/ui/styles";
import { HELP_DESK } from "@/lib/contact";

export const metadata: Metadata = { title: "Terms and conditions" };

const SECTIONS = [
  {
    title: "This is a demo",
    body: "Brokwise is a demo insurance broker built to show a website, a CRM and a payment gateway working together. Every insurer, plan, price and person on this site is made up.",
  },
  {
    title: "No real cover",
    body: "Choosing a plan and paying here does not buy insurance. No policy is issued and no insurer is contacted.",
  },
  {
    title: "Payments are test payments",
    body: "Payments go through PaySandbox in test mode. No money moves and real cards are refused. Use a test card such as 4242 4242 4242 4242, and never enter a real card.",
  },
  {
    title: "Your details",
    body: "Use made-up details only. What you type is stored in the demo CRM so the journey can be shown end to end, and it may be deleted at any time.",
  },
  {
    title: "Prices",
    body: "Prices are worked out from your answers with made-up rates. They are examples, not offers.",
  },
] as const;

/** The demo's terms: what the checkbox on the payment page agrees to. */
export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 md:py-16">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Terms and conditions</h1>
          <p className="mt-2 text-lg text-muted">Short, because nothing here is real.</p>
        </div>
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold">{section.title}</h2>
            <p className="mt-2 leading-relaxed text-ink">{section.body}</p>
          </section>
        ))}
        <section>
          <h2 className="text-xl font-bold">Questions</h2>
          <p className="mt-2 leading-relaxed text-ink">
            Write to{" "}
            <a href={`mailto:${HELP_DESK.email}`} className={textLink}>
              {HELP_DESK.email}
            </a>
            .
          </p>
        </section>
        <Link href="/" className={`w-fit ${textLink}`}>
          Back to home
        </Link>
      </main>
    </>
  );
}
