import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { InsurerMark } from "@/components/insurer-mark";
import { PageLoading } from "@/components/page-loading";
import { SiteHeader } from "@/components/site-header";
import { SuccessMark } from "@/components/success-mark";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { contactOf } from "@/lib/contact";
import { readJourney } from "@/lib/journey";
import { formatUsd } from "@/lib/money";
import { getOpportunity } from "@/lib/policydesk";
import { TOTAL_LABEL } from "@/lib/price-period";
import { lobFrom, stayInOwnLine } from "@/lobs/from-params";

export const metadata: Metadata = { title: "Your choice", robots: { index: false } };

export default function SelectedPage({ params }: PageProps<"/[lob]/selected">) {
  return (
    <Suspense fallback={<PageLoading label="Loading your choice…" />}>
      <Selected params={params} />
    </Suspense>
  );
}

async function Selected({ params }: { params: Promise<{ lob: string }> }) {
  const lob = await lobFrom(params);
  const publicId = await readJourney();
  if (!publicId) redirect(`/${lob.slug}`);
  const view = await getOpportunity(publicId);
  if (!view) redirect(`/${lob.slug}`);
  stayInOwnLine(view.opportunity.product, lob, "selected");
  if (!view.lead) redirect(`/${lob.slug}/received`);
  const selection = view.selection;
  if (!selection) redirect(`/${lob.slug}/plans`);

  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <Stepper current="plan" />
        <div className="flex flex-col gap-3">
          <SuccessMark />
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Your choice is saved</h1>
          <p className="text-lg">
            Quote reference:{" "}
            <strong className="font-mono tracking-wide" data-testid="quote-reference">
              {selection.quoteReference}
            </strong>
          </p>
        </div>

        <Card aria-labelledby="choice">
          <div className="flex items-center gap-3">
            <InsurerMark insurer={selection.insurer} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-muted">{selection.insurer}</p>
              <h2 id="choice" className="text-xl font-bold">
                {selection.planName}
              </h2>
            </div>
          </div>
          <div className="mt-3">
            <Badge tone="pine">{selection.coverLabel}</Badge>
          </div>

          <dl className="mt-4 flex flex-col divide-y divide-line">
            {selection.lines.map((line, i) => (
              <div key={`${line.kind}-${i}`} className="flex items-baseline justify-between gap-4 py-2.5">
                <dt>{line.kind === "plan" ? `${line.label} (plan)` : line.label}</dt>
                <dd className="shrink-0 font-semibold">
                  {line.kind === "included" ? <span className="text-pine-dark">Included</span> : formatUsd(line.amount)}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 pt-3">
              <dt className="font-bold">{TOTAL_LABEL[lob.pricePeriod(selection.cover)]}</dt>
              <dd className="text-2xl font-extrabold" data-testid="selection-total">
                {formatUsd(selection.total)}
              </dd>
            </div>
          </dl>
        </Card>

        <div className="flex flex-col gap-3 md:flex-row">
          <Link href={`/${lob.slug}/payment`} className={primaryButton}>
            Continue to payment
            <ArrowRight aria-hidden className="size-5" />
          </Link>
          <Link href={`/${lob.slug}/plans`} className={secondaryButton}>
            Change plan
          </Link>
        </div>
      </main>
    </>
  );
}
