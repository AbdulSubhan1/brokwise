import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { contactOf } from "@/lib/contact";
import { SiteHeader } from "@/components/site-header";
import { readJourney } from "@/lib/journey";
import { getOpportunity } from "@/lib/policydesk";

export const metadata: Metadata = { title: "Request received", robots: { index: false } };

export default function ReceivedPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Received />
    </Suspense>
  );
}

function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <p className="text-muted">Loading your request…</p>
      </main>
    </>
  );
}

async function Received() {
  // Only the browser that sent the form holds a valid journey cookie; anything else goes back to the start,
  // without asking PolicyDesk about a guessed id.
  const publicId = await readJourney();
  if (!publicId) redirect("/car");
  const view = await getOpportunity(publicId);
  if (!view) redirect("/car");

  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 md:py-16">
        <div className="flex flex-col gap-3">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-pine text-2xl text-white">
            ✓
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Request received</h1>
          {view.lead && (
            <p className="text-lg">
              Your reference: <strong className="font-mono tracking-wide">{view.lead.reference}</strong>
            </p>
          )}
        </div>

        <section aria-labelledby="next" className="rounded-xl border border-line bg-card p-5 md:p-6">
          <h2 id="next" className="text-lg font-bold">
            What happens next
          </h2>
          {view.lead ? (
            <p className="mt-2 text-muted">
              Your plans are ready.{" "}
              <Link href="/car/plans" className="font-semibold text-pine underline underline-offset-2">
                See your plans
              </Link>
            </p>
          ) : (
            <>
              <p className="mt-2 text-muted">Your coordinator will call you.</p>
              <p className="mt-2 text-muted">
                When your coordinator has your details, they&apos;ll send you a payment link.
              </p>
            </>
          )}
          <p className="mt-4 text-sm text-muted">
            {view.contact
              ? `${view.contact.name} is looking after your request. Their details are at the top of the page.`
              : "All our coordinators are busy right now. The Brokwise help desk will make sure someone calls you."}
          </p>
        </section>

        <Link href="/" className="w-fit font-semibold text-pine underline underline-offset-2">
          Back to home
        </Link>
      </main>
    </>
  );
}
