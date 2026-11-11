import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { DemoNotice } from "@/components/demo-notice";
import { OrderLines } from "@/components/order-lines";
import { PaymentForm } from "@/components/payment-form";
import { SiteHeader } from "@/components/site-header";
import { contactOf } from "@/lib/contact";
import { readJourney } from "@/lib/journey";
import { getOpportunity, getPaymentSummary } from "@/lib/policydesk";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default function PaymentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Payment />
    </Suspense>
  );
}

function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-muted">Loading your payment…</p>
      </main>
    </>
  );
}

async function Payment() {
  const publicId = await readJourney();
  if (!publicId) redirect("/car");

  const [view, result] = await Promise.all([getOpportunity(publicId), getPaymentSummary(publicId)]);
  if (!view) redirect("/car");
  if (!result.ok) {
    // A short-form journey has no lead; a full-form one without a saved plan picks one first.
    if (result.code === "no_lead") redirect("/car/received");
    if (result.code === "no_selection") redirect("/car/plans");
    if (result.status === 404) redirect("/car");
    throw new Error(`PolicyDesk answered ${result.status} (${result.code}) for the payment summary`);
  }
  const summary = result.data;
  if (summary.status === "already_paid") redirect("/car/thank-you");

  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <div>
          <p className="text-sm font-semibold tracking-wide text-pine uppercase">Car insurance</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Payment</h1>
          <p className="mt-2 text-lg">
            Quote reference:{" "}
            <strong className="font-mono tracking-wide" data-testid="quote-reference">
              {summary.quoteReference}
            </strong>
          </p>
        </div>

        <DemoNotice />

        <section aria-labelledby="summary" className="rounded-xl border border-line bg-card p-5 md:p-6">
          <h2 id="summary" className="text-lg font-bold">
            What you pay
          </h2>
          <div className="mt-2">
            <OrderLines lines={summary.lines} total={summary.total} totalLabel="Total a year" />
          </div>
        </section>

        <PaymentForm total={summary.total} />

        <Link href="/car/plans" className="w-fit font-semibold text-pine underline underline-offset-2">
          Change plan
        </Link>
      </main>
    </>
  );
}
