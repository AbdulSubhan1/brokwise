import type { Metadata } from "next";
import { Suspense } from "react";
import { PayLinkProblem } from "@/components/pay-link-problem";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Link not valid", robots: { index: false } };

export default function PayLinkInvalidPage({ searchParams }: PageProps<"/pay/invalid">) {
  return (
    <Suspense fallback={<Loading />}>
      <Invalid searchParams={searchParams} />
    </Suspense>
  );
}

function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-muted">Loading…</p>
      </main>
    </>
  );
}

async function Invalid({ searchParams }: Pick<PageProps<"/pay/invalid">, "searchParams">) {
  // ?retry=1: PolicyDesk couldn't be reached, so the link itself may be fine.
  if ((await searchParams).retry === "1") {
    return (
      <PayLinkProblem title="Something went wrong" body="We couldn't open your link. Please try again." />
    );
  }
  return (
    <PayLinkProblem
      title="Link not valid"
      body="This payment link isn't valid. Check the link your coordinator sent, or ask for a new one."
    />
  );
}
