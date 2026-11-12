import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { SiteHeader } from "@/components/site-header";
import { contactOf } from "@/lib/contact";
import { readJourney } from "@/lib/journey";
import { formatUsd } from "@/lib/money";
import { lobFrom, stayInOwnLine } from "@/lobs/from-params";
import { getOpportunity } from "@/lib/policydesk";

export const metadata: Metadata = { title: "Your choice", robots: { index: false } };

export default function SelectedPage({ params }: PageProps<"/[lob]/selected">) {
  return (
    <Suspense fallback={<Loading />}>
      <Selected params={params} />
    </Suspense>
  );
}

function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-muted">Loading your choice…</p>
      </main>
    </>
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
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 md:py-16">
        <div className="flex flex-col gap-3">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-pine text-2xl text-white">
            ✓
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Your choice is saved</h1>
          <p className="text-lg">
            Quote reference:{" "}
            <strong className="font-mono tracking-wide" data-testid="quote-reference">
              {selection.quoteReference}
            </strong>
          </p>
        </div>

        <section aria-labelledby="choice" className="rounded-xl border border-line bg-card p-5 md:p-6">
          <p className="text-sm font-semibold text-muted">{selection.insurer}</p>
          <h2 id="choice" className="text-xl font-bold">
            {selection.planName}
          </h2>
          <p className="text-sm text-muted">{selection.coverLabel}</p>

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
              <dt className="font-bold">Total a year</dt>
              <dd className="text-2xl font-extrabold" data-testid="selection-total">
                {formatUsd(selection.total)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="flex flex-col gap-3 md:flex-row">
          <Link
            href={`/${lob.slug}/payment`}
            className="rounded-lg bg-pine px-5 py-3 text-center font-semibold text-white hover:bg-pine-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
          >
            Continue to payment
          </Link>
          <Link
            href={`/${lob.slug}/plans`}
            className="rounded-lg border border-pine px-5 py-3 text-center font-semibold text-pine hover:bg-pine-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
          >
            Change plan
          </Link>
        </div>
      </main>
    </>
  );
}
