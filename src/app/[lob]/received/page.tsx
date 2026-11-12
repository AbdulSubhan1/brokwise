import { FileText, ListChecks, PhoneCall, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { PageLoading } from "@/components/page-loading";
import { PulseEvent } from "@/components/pulse-event";
import { SiteHeader } from "@/components/site-header";
import { SuccessMark } from "@/components/success-mark";
import { Timeline } from "@/components/timeline";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { primaryButton, textLink } from "@/components/ui/styles";
import { contactOf } from "@/lib/contact";
import { readJourney } from "@/lib/journey";
import { getOpportunity } from "@/lib/policydesk";
import { lobFrom, stayInOwnLine } from "@/lobs/from-params";

export const metadata: Metadata = { title: "Request received", robots: { index: false } };

export default function ReceivedPage({ params }: PageProps<"/[lob]/received">) {
  return (
    <Suspense fallback={<PageLoading label="Loading your request…" />}>
      <Received params={params} />
    </Suspense>
  );
}

async function Received({ params }: { params: Promise<{ lob: string }> }) {
  const lob = await lobFrom(params);
  // Only the browser that sent the form holds a valid journey cookie; anything else goes back to the start,
  // without asking PolicyDesk about a guessed id.
  const publicId = await readJourney();
  if (!publicId) redirect(`/${lob.slug}`);
  const view = await getOpportunity(publicId);
  if (!view) redirect(`/${lob.slug}`);
  stayInOwnLine(view.opportunity.product, lob, "received");

  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <Stepper current="plan" />
        <PulseEvent name="callback_requested" label={lob.slug} />
        <div className="flex flex-col gap-3">
          <SuccessMark />
          <p className="font-semibold text-pine">{lob.title}</p>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Request received</h1>
          {view.lead && (
            <p className="text-lg">
              Your reference: <strong className="font-mono tracking-wide">{view.lead.reference}</strong>
            </p>
          )}
        </div>

        <Card aria-labelledby="next">
          <h2 id="next" className="text-lg font-bold">
            What happens next
          </h2>
          {view.lead ? (
            <div className="mt-2">
              <p className="text-muted">Your plans are ready.</p>
              <Link
                href={`/${lob.slug}/plans`}
                data-pulse-event="plans_opened"
                data-pulse-label={`${lob.slug}: request received`}
                className={`${primaryButton} mt-4`}
              >
                <ListChecks aria-hidden className="size-5" />
                See your plans
              </Link>
            </div>
          ) : (
            <Timeline
              steps={[
                { icon: PhoneCall, title: "We call you", body: <p>Your coordinator will call you.</p> },
                {
                  icon: FileText,
                  title: "You choose a plan together",
                  body: <p>When your coordinator has your details, they&apos;ll send you a payment link.</p>,
                },
                { icon: ShieldCheck, title: "You pay and you're covered", body: <p>Pay online through the link.</p> },
              ]}
            />
          )}
          <p className="mt-5 border-t border-line pt-4 text-sm text-muted">
            {view.contact
              ? `${view.contact.name} is looking after your request. Their details are at the top of the page.`
              : "All our coordinators are busy right now. The Brokwise help desk will make sure someone calls you."}
          </p>
        </Card>

        <Link href="/" data-pulse-event="back_home_clicked" data-pulse-label="request received" className={`w-fit ${textLink}`}>
          Back to home
        </Link>
      </main>
    </>
  );
}
