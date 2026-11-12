import { Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { DemoNotice } from "@/components/demo-notice";
import { OrderLines } from "@/components/order-lines";
import { PageIntro } from "@/components/page-intro";
import { PageLoading } from "@/components/page-loading";
import { PaymentForm } from "@/components/payment-form";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { textLink } from "@/components/ui/styles";
import { contactOf } from "@/lib/contact";
import { readJourney } from "@/lib/journey";
import { getOpportunity, getPaymentSummary } from "@/lib/policydesk";
import { TOTAL_LABEL } from "@/lib/price-period";
import { lobFrom, stayInOwnLine } from "@/lobs/from-params";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default function PaymentPage({ params }: PageProps<"/[lob]/payment">) {
  return (
    <Suspense fallback={<PageLoading label="Loading your payment…" />}>
      <Payment params={params} />
    </Suspense>
  );
}

async function Payment({ params }: { params: Promise<{ lob: string }> }) {
  const lob = await lobFrom(params);
  const publicId = await readJourney();
  if (!publicId) redirect(`/${lob.slug}`);

  const [view, result] = await Promise.all([getOpportunity(publicId), getPaymentSummary(publicId)]);
  if (!view) redirect(`/${lob.slug}`);
  stayInOwnLine(view.opportunity.product, lob, "payment");
  if (!result.ok) {
    // A short-form journey has no lead; a full-form one without a saved plan picks one first.
    if (result.code === "no_lead") redirect(`/${lob.slug}/received`);
    if (result.code === "no_selection") redirect(`/${lob.slug}/plans`);
    if (result.status === 404) redirect(`/${lob.slug}`);
    throw new Error(`PolicyDesk answered ${result.status} (${result.code}) for the payment summary`);
  }
  const summary = result.data;
  if (summary.status === "already_paid") redirect(`/${lob.slug}/thank-you`);
  // The summary is the saved choice, so its cover says what the total is for.
  const period = view.selection ? lob.pricePeriod(view.selection.cover) : "year";

  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <Stepper current="pay" />
        <PageIntro line={lob} title="Payment">
          <p className="text-lg text-ink">
            Quote reference:{" "}
            <strong className="font-mono tracking-wide" data-testid="quote-reference">
              {summary.quoteReference}
            </strong>
          </p>
        </PageIntro>

        <DemoNotice />

        <Card aria-labelledby="summary">
          <h2 id="summary" className="text-lg font-bold">
            What you pay
          </h2>
          <div className="mt-2">
            <OrderLines lines={summary.lines} total={summary.total} totalLabel={TOTAL_LABEL[period]} />
          </div>
        </Card>

        <Card aria-labelledby="pay-title">
          <h2 id="pay-title" className="flex items-center gap-2 text-lg font-bold">
            <Lock aria-hidden className="size-5 text-pine" />
            Pay securely
          </h2>
          <div className="mt-4">
            <PaymentForm lob={lob.slug} total={summary.total} />
          </div>
        </Card>

        <Link href={`/${lob.slug}/plans`} className={`w-fit ${textLink}`}>
          Change plan
        </Link>
      </main>
    </>
  );
}
