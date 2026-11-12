import type { Metadata } from "next";
import { Suspense } from "react";
import { PayLinkProblem } from "@/components/pay-link-problem";
import { PageLoading } from "@/components/page-loading";

export const metadata: Metadata = { title: "Link not valid", robots: { index: false } };

export default function PayLinkInvalidPage({ searchParams }: PageProps<"/pay/invalid">) {
  return (
    <Suspense fallback={<PageLoading label="Loading…" />}>
      <Invalid searchParams={searchParams} />
    </Suspense>
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
