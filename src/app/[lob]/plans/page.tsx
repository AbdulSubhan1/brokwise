import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { DemoNotice } from "@/components/demo-notice";
import { PageIntro } from "@/components/page-intro";
import { PageLoading } from "@/components/page-loading";
import { PlanCard } from "@/components/plan-card";
import { SiteHeader } from "@/components/site-header";
import { Stepper } from "@/components/ui/stepper";
import { contactOf } from "@/lib/contact";
import { TOO_MANY_REQUESTS } from "@/lib/form-state";
import { readJourney } from "@/lib/journey";
import { planTags } from "@/lib/plan-tags";
import { getOpportunity, getPlans } from "@/lib/policydesk";
import { lobFrom, stayInOwnLine } from "@/lobs/from-params";

export const metadata: Metadata = { title: "Choose your plan", robots: { index: false } };

const ERRORS: Record<string, string> = {
  unavailable: "That choice is no longer available. Please pick again.",
  failed: "We couldn't save your choice. Please try again.",
  rate_limited: TOO_MANY_REQUESTS,
};

export default function PlansPage({ params, searchParams }: PageProps<"/[lob]/plans">) {
  return (
    <Suspense fallback={<PageLoading label="Loading your plans…" wide />}>
      <Plans params={params} searchParams={searchParams} />
    </Suspense>
  );
}

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

async function Plans({ params, searchParams }: Pick<PageProps<"/[lob]/plans">, "params" | "searchParams">) {
  const lob = await lobFrom(params);
  // Same gate as the received page: no valid journey cookie, no call to PolicyDesk.
  const publicId = await readJourney();
  if (!publicId) redirect(`/${lob.slug}`);

  const [view, result] = await Promise.all([getOpportunity(publicId), getPlans(publicId)]);
  if (!view) redirect(`/${lob.slug}`);
  stayInOwnLine(view.opportunity.product, lob, "plans");
  if (!result.ok) {
    // A short-form journey has no lead yet, so no plans: its coordinator takes it from here.
    if (result.code === "no_lead") redirect(`/${lob.slug}/received`);
    if (result.status === 404) redirect(`/${lob.slug}`);
    throw new Error(`PolicyDesk answered ${result.status} (${result.code}) for the plans`);
  }

  const query = await searchParams;
  const covers = [{ value: "", label: "All" }, ...lob.covers];
  const cover = lob.covers.some((c) => c.value === one(query.cover)) ? one(query.cover) : "";
  const error = ERRORS[one(query.error)];
  // Tags are worked out on every plan, so a filter doesn't move them.
  const tags = planTags(result.plans, lob.bestValueCover);
  const plans = cover ? result.plans.filter((p) => p.cover === cover) : result.plans;
  const selection = view.selection;
  // Car, home and health plans run a year; travel has per-trip plans too.
  const allYearly = lob.covers.every((c) => lob.pricePeriod(c.value) === "year");

  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <div className="max-w-3xl">
          <Stepper current="plan" />
        </div>
        <PageIntro line={lob} title="Choose your plan">
          <p>
            {allYearly
              ? "Prices are yearly, in US dollars."
              : "Prices are per trip, or per year for annual plans, in US dollars."}
          </p>
          {view.lead && (
            <p className="mt-1 text-sm">
              Your reference: <strong className="font-mono tracking-wide text-ink">{view.lead.reference}</strong>
            </p>
          )}
        </PageIntro>

        <DemoNotice />

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 font-medium text-danger">
            {error}
          </p>
        )}

        <nav aria-label="Filter by cover" className="-mx-4 overflow-x-auto px-4">
          <ul className="flex w-max gap-2">
            {covers.map((c) => {
              const active = c.value === cover;
              return (
                <li key={c.value || "all"}>
                  <Link
                    href={c.value ? `/${lob.slug}/plans?cover=${c.value}` : `/${lob.slug}/plans`}
                    aria-current={active ? "page" : undefined}
                    scroll={false}
                    className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine ${
                      active ? "border-pine bg-pine text-white" : "border-line bg-card text-ink hover:border-pine"
                    }`}
                  >
                    {c.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {plans.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-5 text-muted">
            No plans with this cover right now. Try another cover or ask your coordinator.
          </p>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {plans.map((plan) => {
              const chosenIds = selection?.planId === plan.id ? selection.addOnIds : undefined;
              // The key changes when the saved choice does, so the card's ticks start again from it.
              return (
                <PlanCard
                  key={`${plan.id}:${chosenIds?.join(",") ?? ""}`}
                  lob={lob.slug}
                  plan={plan}
                  period={lob.pricePeriod(plan.cover)}
                  chosenIds={chosenIds}
                  tags={tags.get(plan.id)}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
