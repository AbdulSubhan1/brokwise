import { FileCheck2, FileText, PhoneCall } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ContactCard } from "@/components/contact-card";
import { OrderLines } from "@/components/order-lines";
import { PageLoading } from "@/components/page-loading";
import { PaymentPending } from "@/components/payment-pending";
import { SiteHeader } from "@/components/site-header";
import { SuccessMark } from "@/components/success-mark";
import { Timeline } from "@/components/timeline";
import { Card } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";
import { textLink } from "@/components/ui/styles";
import { contactOf } from "@/lib/contact";
import { readJourney } from "@/lib/journey";
import { getOpportunity, getOrder, type OrderView } from "@/lib/policydesk";
import { lobFrom, stayInOwnLine } from "@/lobs/from-params";
import type { LobConfig } from "@/lobs";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

// Brokwise's people and help desk are in Pakistan, so the payment date is shown on their calendar.
const PAID_ON = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "Asia/Karachi" });

export default function ThankYouPage({ params }: PageProps<"/[lob]/thank-you">) {
  return (
    <Suspense fallback={<PageLoading label="Loading your order…" />}>
      <ThankYou params={params} />
    </Suspense>
  );
}

async function ThankYou({ params }: { params: Promise<{ lob: string }> }) {
  const lob = await lobFrom(params);
  const publicId = await readJourney();
  if (!publicId) redirect(`/${lob.slug}`);

  const result = await getOrder(publicId);
  if (!result.ok) {
    if (result.code === "no_lead") redirect(`/${lob.slug}/received`);
    if (result.status === 404) redirect(`/${lob.slug}`);
    throw new Error(`PolicyDesk answered ${result.status} (${result.code}) for the order`);
  }
  const { order, advisor } = result.data;
  if (!order) redirect(`/${lob.slug}/payment`);
  if (order.status === "paid") return <Paid lob={lob} order={order} advisor={advisor} />;

  // Not confirmed yet: the coordinator still looks after the journey, so the header shows them.
  const view = await getOpportunity(publicId);
  if (!view) redirect(`/${lob.slug}`);
  stayInOwnLine(view.opportunity.product, lob, "thank-you");
  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf(view)} />} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <Stepper current="pay" />
        <div className="flex flex-col gap-3">
          <span
            aria-hidden
            className="size-12 animate-spin rounded-full border-4 border-pine-soft border-t-pine motion-reduce:animate-none"
          />
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Confirming your payment…</h1>
          <p className="text-lg">
            Quote reference: <strong className="font-mono tracking-wide">{order.quoteReference}</strong>
          </p>
        </div>
        <PaymentPending />
      </main>
    </>
  );
}

function Paid({
  lob,
  order,
  advisor,
}: {
  lob: LobConfig;
  order: NonNullable<OrderView["order"]>;
  advisor: OrderView["advisor"];
}) {
  return (
    <>
      <SiteHeader aside={<ContactCard person={contactOf({ contact: advisor }, order.quoteReference)} />} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <Stepper current="done" />
        <div className="flex flex-col gap-3">
          <SuccessMark />
          <p className="font-semibold text-pine">{lob.title}</p>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Payment received</h1>
          <p className="text-lg">
            Quote reference:{" "}
            <strong className="font-mono tracking-wide" data-testid="quote-reference">
              {order.quoteReference}
            </strong>
          </p>
        </div>

        <Card aria-labelledby="paid">
          <h2 id="paid" className="text-lg font-bold">
            Your order
          </h2>
          <div className="mt-2">
            <OrderLines lines={order.lines} total={order.total} totalLabel="Total paid" />
          </div>
          <ul className="mt-4 flex flex-col gap-1 border-t border-line pt-4 text-sm text-muted">
            {order.paidAt && <li>Paid on {PAID_ON.format(new Date(order.paidAt))}</li>}
            {order.paymentId && (
              <li>
                PaySandbox payment{" "}
                <span className="font-mono text-ink" data-testid="payment-id">
                  {order.paymentId}
                </span>
              </li>
            )}
            <li>A receipt goes to {order.emailMasked}</li>
          </ul>
        </Card>

        <Card aria-labelledby="next">
          <h2 id="next" className="text-lg font-bold">
            What happens next
          </h2>
          <Timeline
            steps={[
              {
                icon: PhoneCall,
                title: advisor ? "Your advisor calls you" : "We find you an advisor",
                body: (
                  <p>
                    {advisor
                      ? `Your advisor ${advisor.name} will contact you about documents.`
                      : "The Brokwise help desk will find you an advisor, who will contact you about documents."}
                  </p>
                ),
              },
              {
                icon: FileText,
                title: "You send your documents",
                body: <p>They will call you on {order.phoneMasked} and tell you what to send.</p>,
              },
              {
                icon: FileCheck2,
                title: "Your policy is issued",
                body: <p>Your policy is issued once your documents are checked.</p>,
              },
            ]}
          />
        </Card>

        <Link href="/" className={`w-fit ${textLink}`}>
          Back to home
        </Link>
      </main>
    </>
  );
}
