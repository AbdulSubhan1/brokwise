import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { DemoNotice } from "@/components/demo-notice";
import { PlanCard } from "@/components/plan-card";
import { SiteHeader } from "@/components/site-header";
import { contactOf } from "@/lib/contact";
import { TOO_MANY_REQUESTS } from "@/lib/form-state";
import { readJourney } from "@/lib/journey";
import { getOpportunity, getPlans } from "@/lib/policydesk";

export const metadata: Metadata = { title: "Choose your plan", robots: { index: false } };

const COVERS = [
  { value: "", label: "All" },
  { value: "third_party", label: "Third party" },
  { value: "comprehensive", label: "Comprehensive" },
  { value: "comprehensive_agency", label: "Agency repair" },
] as const;

const ERRORS: Record<string, string> = {
  unavailable: "That choice is no longer available. Please pick again.",
  failed: "We couldn't save your choice. Please try again.",
  rate_limited: TOO_MANY_REQUESTS,
};

export default function PlansPage({ searchParams }: PageProps<"/car/plans">) {
  return (
    <Suspense fallback={<Loading />}>
      <Plans searchParams={searchParams} />
    </Suspense>
  );
}

function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <p className="text-muted">Loading your plans…</p>
      </main>
    </>
  );
}

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

async function Plans({ searchParams }: { searchParams: PageProps<"/car/plans">["searchParams"] }) {
  // Same gate as the received page: no valid journey cookie, no call to PolicyDesk.
  const publicId = await readJourney();
  if (!publicId) redirect("/car");

  const [view, result] = await Promise.all([getOpportunity(publicId), getPlans(publicId)]);
  if (!view) redirect("/car");
  if (!result.ok) {
    // A short-form journey has no lead yet, so no plans: its coordinator takes it from here.
    if (result.code === "no_lead") redirect("/car/received");
    if (result.status === 404) redirect("/car");
    throw new Error(`PolicyDesk answered ${result.status} (${result.code}) for the plans`);
  }

  const params = await searchParams;
  const cover = COVERS.some((c) => c.value === one(params.cover)) ? one(params.cover) : "";
  const error = ERRORS[one(params.error)];
  const plans = cover ? result.plans.filter((p) => p.cover === cover) : result.plans;
  const selection = view.selection;

  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <div>
          <p className="text-sm font-semibold tracking-wide text-pine uppercase">Car insurance</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Choose your plan</h1>
          <p className="mt-2 text-muted">Prices are yearly, in US dollars.</p>
          {view.lead && (
            <p className="mt-1 text-sm text-muted">
              Your reference: <strong className="font-mono tracking-wide text-ink">{view.lead.reference}</strong>
            </p>
          )}
        </div>

        <DemoNotice />

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 font-medium text-danger">
            {error}
          </p>
        )}

        <nav aria-label="Filter by cover">
          <ul className="flex flex-wrap gap-2">
            {COVERS.map((c) => {
              const active = c.value === cover;
              return (
                <li key={c.value || "all"}>
                  <Link
                    href={c.value ? `/car/plans?cover=${c.value}` : "/car/plans"}
                    aria-current={active ? "page" : undefined}
                    scroll={false}
                    className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine ${
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
          <p className="rounded-xl border border-line bg-card p-5 text-muted">
            No plans with this cover right now. Try another cover or ask your coordinator.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {plans.map((plan) => {
              const chosenIds = selection?.planId === plan.id ? selection.addOnIds : undefined;
              // The key changes when the saved choice does, so the card's ticks start again from it.
              return <PlanCard key={`${plan.id}:${chosenIds?.join(",") ?? ""}`} plan={plan} chosenIds={chosenIds} />;
            })}
          </div>
        )}
      </main>
    </>
  );
}
