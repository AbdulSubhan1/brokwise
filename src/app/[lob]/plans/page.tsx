import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { DemoNotice } from "@/components/demo-notice";
import { PageLoading } from "@/components/page-loading";
import { PlanFilters } from "@/components/plan-filters";
import { PlanList } from "@/components/plan-list";
import { QuoteSummary } from "@/components/quote-summary";
import { SiteHeader } from "@/components/site-header";
import { Stepper } from "@/components/ui/stepper";
import { readAnswers } from "@/lib/answers";
import { contactOf } from "@/lib/contact";
import { TOO_MANY_REQUESTS } from "@/lib/form-state";
import { readJourney } from "@/lib/journey";
import { coverFrom, FIRST_PLANS, showsUnder, sortFrom, sortPlans, tabOf } from "@/lib/plan-list";
import { planTags } from "@/lib/plan-tags";
import { getOpportunity, getPlans } from "@/lib/policydesk";
import { todayIso } from "@/lib/travel-dates";
import { pricesNote, priceWords } from "@/lobs";
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

async function Plans({ params, searchParams }: Pick<PageProps<"/[lob]/plans">, "params" | "searchParams">) {
  const lob = await lobFrom(params);
  // Same gate as the received page: no valid journey cookie, no call to PolicyDesk.
  const publicId = await readJourney();
  if (!publicId) redirect(`/${lob.slug}`);

  const [view, result, answers] = await Promise.all([
    getOpportunity(publicId),
    getPlans(publicId),
    readAnswers(lob.slug, publicId),
  ]);
  if (!view) redirect(`/${lob.slug}`);
  stayInOwnLine(view.opportunity.product, lob, "plans");
  if (!result.ok) {
    // A short-form journey has no lead yet, so no plans: its coordinator takes it from here.
    if (result.code === "no_lead") redirect(`/${lob.slug}/received`);
    if (result.status === 404) redirect(`/${lob.slug}`);
    throw new Error(`PolicyDesk answered ${result.status} (${result.code}) for the plans`);
  }

  const query = await searchParams;
  const cover = coverFrom(query.cover, lob.covers);
  const sort = sortFrom(query.sort);
  const error = ERRORS[typeof query.error === "string" ? query.error : ""];
  // What was quoted comes from the answers this browser sent (PolicyDesk doesn't give them back); without them, the line.
  const summary = answers ? lob.summary(answers, todayIso()) : { title: lob.title, facts: [], forWhom: lob.forWhom };

  // Tags are worked out on every plan, so a filter doesn't move them.
  const tags = planTags(result.plans, lob.bestValueCover);
  const plans = sortPlans(
    result.plans.filter((p) => showsUnder(p.cover, cover, lob.covers)),
    sort,
  );
  const tab = tabOf(cover, lob.covers);
  const tabs = [{ value: "", label: "All" }, ...lob.covers.filter((c) => !c.within)].map((c) => ({
    value: c.value,
    label: c.label,
    count: result.plans.filter((p) => showsUnder(p.cover, c.value, lob.covers)).length,
  }));
  const narrower = lob.covers.find((c) => c.within && c.only);
  const bestValueCover = lob.covers.find((c) => c.value === lob.bestValueCover)?.label;
  const selection = view.selection;

  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <div className="max-w-3xl">
          <Stepper current="plan" />
        </div>

        <QuoteSummary
          icon={lob.icon}
          summary={summary}
          reference={view.lead?.reference}
          editHref={`/${lob.slug}/details`}
        />

        <PlanFilters
          lob={lob.slug}
          tabs={tabs}
          tab={tab}
          only={narrower && { value: narrower.value, label: narrower.only!, checked: cover === narrower.value }}
          sort={sort}
        >
          <h1 className="text-[1.625rem] font-extrabold tracking-tight md:text-[2.125rem]">
            {plans.length} {plans.length === 1 ? "plan" : "plans"} for {summary.forWhom}
          </h1>
          <p className="mt-1.5 text-muted">
            {pricesNote(lob, cover)} Extras are optional and added only if you tick them.
          </p>
        </PlanFilters>

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 font-medium text-danger">
            {error}
          </p>
        )}

        {plans.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card p-5 text-muted">
            No plans with this cover right now. Try another cover or ask your coordinator.
          </p>
        ) : (
          <PlanList
            view={`${cover}:${sort}`}
            lob={lob.slug}
            first={FIRST_PLANS}
            bestValueLabel={bestValueCover ? `Best value ${bestValueCover.toLowerCase()}` : "Best value"}
            items={plans.map((plan) => ({
              plan,
              chosenIds: selection?.planId === plan.id ? selection.addOnIds : undefined,
              tags: tags.get(plan.id),
              priceWords: priceWords(lob, plan.cover),
            }))}
          />
        )}

        <DemoNotice />
      </main>
    </>
  );
}
