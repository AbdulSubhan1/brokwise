import { ArrowRight, BadgeCheck, Check, CreditCard, ListChecks, PhoneCall, ReceiptText, Tag } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { readJourney } from "@/lib/journey";
import { formatUsd } from "@/lib/money";
import { getOpportunity, getOrder, getPlans } from "@/lib/policydesk";
import { type CardPlan, EXAMPLE_CARD, type ResumeCard as Card, resumeCardFor } from "@/lib/resume-card";
import { InsurerMark } from "./insurer-mark";
import { Badge } from "./ui/badge";
import { primaryButton, textLink } from "./ui/styles";

// The example: real plans from PolicyDesk's catalogue for its "typical" car driver (an $18,000 car on GCC spec, a
// driver of 30 to 59 with 5 or more years on a licence), so the numbers are the ones that driver would see.
const EXAMPLE = {
  subject: "Toyota Corolla 2021 · $18,000",
  count: 9,
  from: 765,
  plans: [
    {
      id: 2,
      insurer: "Northwind Assurance",
      name: "Northwind Plus",
      coverLabel: "Comprehensive",
      excess: 111,
      price: 1110,
      per: "a year",
      tag: "best_value",
    },
    {
      id: 5,
      insurer: "Bluepeak Insurance",
      name: "Bluepeak Plus",
      coverLabel: "Comprehensive",
      excess: 122,
      price: 1215,
      per: "a year",
    },
    {
      id: 7,
      insurer: "Harbor Mutual",
      name: "Harbor Essential",
      coverLabel: "Third-party liability",
      excess: 91,
      price: 910,
      per: "a year",
    },
  ],
} as const satisfies { subject: string; count: number; from: number; plans: readonly CardPlan[] };

const TAGS = {
  cheapest: { label: "Cheapest", icon: Tag, tone: "saffron" },
  best_value: { label: "Best value", icon: BadgeCheck, tone: "solid" },
} as const;

/**
 * The home page's quote card: the visitor's own journey when their journey cookie points to one, else an example.
 * It reads the cookie, so it renders at request time: the home page puts it in <Suspense> with ResumeCardSkeleton,
 * and the rest of the page stays prerendered.
 */
export async function ResumeCard() {
  return <QuoteCard card={await loadCard()} />;
}

/** Asks PolicyDesk only what the card needs, with the calls the journey pages already make. */
async function loadCard(): Promise<Card> {
  const publicId = await readJourney();
  if (!publicId) return EXAMPLE_CARD;
  try {
    const view = await getOpportunity(publicId);
    if (!view?.lead) return resumeCardFor({ view, plans: null, order: null });
    const [plans, order] = await Promise.all([view.selection ? null : getPlans(publicId), getOrder(publicId)]);
    return resumeCardFor({ view, plans, order });
  } catch {
    // PolicyDesk unreachable or answering something unexpected: the home page shows the example instead.
    return EXAMPLE_CARD;
  }
}

/** The card's frame. Every state, and the skeleton, share its size, so nothing jumps when the card streams in. */
function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="flex min-h-[33rem] w-full flex-col rounded-3xl border border-line bg-card p-5 shadow-xl shadow-ink/10 md:min-h-[28.5rem] md:p-6"
    >
      {children}
    </section>
  );
}

function CardHead({ eyebrow, title, aside }: { eyebrow: ReactNode; title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
      <div className="min-w-0">
        <p className="text-sm text-muted">{eyebrow}</p>
        <h2 className="mt-0.5 font-bold text-pretty">{title}</h2>
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  );
}

function PlanRows({ plans }: { plans: readonly CardPlan[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {plans.map((p) => (
        <li
          key={p.id}
          className={`flex items-center gap-3 rounded-2xl border p-3 ${p.tag === "best_value" ? "border-2 border-pine" : "border-line"}`}
        >
          <InsurerMark insurer={p.insurer} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{p.name}</p>
            <p className="text-sm text-muted">
              {p.coverLabel} · excess {formatUsd(p.excess)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-right">
            {p.tag && <Badge tone={TAGS[p.tag].tone}>{TAGS[p.tag].label}</Badge>}
            <p className="text-xl leading-none font-extrabold">{formatUsd(p.price)}</p>
            <p className="text-xs text-muted">{p.per}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A button or link at the bottom of the card. */
function CardFoot({ children }: { children: ReactNode }) {
  return <div className="mt-auto pt-5">{children}</div>;
}

function QuoteCard({ card }: { card: Card }) {
  switch (card.kind) {
    case "example":
      return (
        <Frame label="Example quote">
          <CardHead
            eyebrow={
              <span className="flex items-center gap-2">
                <Badge tone="saffron">Example</Badge>
                {EXAMPLE.count} car plans from {formatUsd(EXAMPLE.from)}
              </span>
            }
            title={EXAMPLE.subject}
          />
          <PlanRows plans={EXAMPLE.plans} />
          <CardFoot>
            <p className="text-sm text-muted">
              Example prices for a typical driver. Yours are worked out from your answers.{" "}
              <Link href="/car/details" className={textLink}>
                Get your car prices
              </Link>
            </p>
          </CardFoot>
        </Frame>
      );

    case "plans":
      return (
        <Frame label={`Your ${card.lob.name.toLowerCase()} quote`}>
          <CardHead
            eyebrow={`Reference ${card.reference}`}
            title={`Continue your ${card.lob.name.toLowerCase()} quote`}
            aside={
              <Badge tone="pine">
                {card.count} {card.count === 1 ? "plan" : "plans"} from {formatUsd(card.from)}
              </Badge>
            }
          />
          <PlanRows plans={card.plans} />
          <CardFoot>
            <Link href={`/${card.lob.slug}/plans`} className={`${primaryButton} w-full`}>
              <ListChecks aria-hidden className="size-5" />
              See your plans
            </Link>
          </CardFoot>
        </Frame>
      );

    case "chosen":
      return (
        <Frame label={`Your ${card.lob.name.toLowerCase()} quote`}>
          <CardHead eyebrow={`Quote reference ${card.reference}`} title={`Continue your ${card.lob.name.toLowerCase()} quote`} />
          <p className="mt-4 text-sm font-semibold text-muted">Your plan</p>
          <div className="mt-2 rounded-2xl border-2 border-pine p-4">
            <div className="flex items-center gap-3">
              <InsurerMark insurer={card.insurer} />
              <div className="min-w-0">
                <p className="text-sm text-muted">{card.insurer}</p>
                <p className="font-bold">{card.planName}</p>
              </div>
            </div>
            <div className="mt-3">
              <Badge tone="pine">{card.coverLabel}</Badge>
            </div>
            <dl className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <dt className="font-semibold">{card.totalLabel}</dt>
              <dd className="text-2xl font-extrabold">{formatUsd(card.total)}</dd>
            </dl>
          </div>
          <CardFoot>
            <Link href={`/${card.lob.slug}/payment`} className={`${primaryButton} w-full`}>
              <CreditCard aria-hidden className="size-5" />
              Review and pay
            </Link>
          </CardFoot>
        </Frame>
      );

    case "paid":
      return (
        <Frame label={`Your ${card.lob.name.toLowerCase()} order`}>
          <CardHead
            eyebrow={`Quote reference ${card.reference}`}
            title="Payment received"
            aside={
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-pine text-white">
                <Check className="size-5" strokeWidth={3} />
              </span>
            }
          />
          <div className="mt-4 rounded-2xl border border-line p-4">
            <p className="text-sm text-muted">{card.lob.title}</p>
            <p className="font-bold">{card.plan}</p>
            <dl className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
              <dt className="font-semibold">Total paid</dt>
              <dd className="text-2xl font-extrabold">{formatUsd(card.total)}</dd>
            </dl>
          </div>
          <p className="mt-4 text-sm text-muted">Your advisor will contact you about documents.</p>
          <CardFoot>
            <Link href={`/${card.lob.slug}/thank-you`} className={`${primaryButton} w-full`}>
              <ReceiptText aria-hidden className="size-5" />
              See your order
            </Link>
          </CardFoot>
        </Frame>
      );

    case "call_back":
      return (
        <Frame label={`Your ${card.lob.name.toLowerCase()} request`}>
          <CardHead
            eyebrow={card.lob.title}
            title="We'll call you"
            aside={
              <span aria-hidden className="grid size-10 place-items-center rounded-full bg-pine-soft text-pine">
                <PhoneCall className="size-5" />
              </span>
            }
          />
          <p className="mt-4">
            {card.coordinator
              ? `${card.coordinator}, your coordinator, will call you to find a plan with you.`
              : "All our coordinators are busy right now. The Brokwise help desk will make sure someone calls you."}
          </p>
          <ol className="mt-4 flex flex-col gap-3 rounded-2xl bg-paper p-4 text-sm">
            {[
              "We call you",
              "You choose a plan together, and your coordinator sends you a payment link",
              "You pay online through the link",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span
                  aria-hidden
                  className="grid size-6 shrink-0 place-items-center rounded-full bg-pine text-xs font-bold text-white"
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <CardFoot>
            <Link href={`/${card.lob.slug}/received`} className={`inline-flex items-center gap-1.5 ${textLink}`}>
              See your request
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </CardFoot>
        </Frame>
      );
  }
}

/** The card's placeholder while the request-time part streams in: the same frame and size, with grey blocks. */
export function ResumeCardSkeleton() {
  const block = "rounded-md bg-paper motion-safe:animate-pulse";
  return (
    <Frame label="Your quote">
      <p role="status" className="sr-only">
        Loading your quote…
      </p>
      <div aria-hidden className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div className="flex-1">
            <div className={`h-4 w-40 ${block}`} />
            <div className={`mt-2 h-5 w-56 max-w-full ${block}`} />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <div className={`size-11 shrink-0 rounded-xl ${block}`} />
              <div className="flex-1">
                <div className={`h-4 w-32 ${block}`} />
                <div className={`mt-2 h-3.5 w-44 max-w-full ${block}`} />
              </div>
              <div className={`h-6 w-16 ${block}`} />
            </div>
          ))}
        </div>
        <div className={`mt-auto h-12 w-full ${block}`} />
      </div>
    </Frame>
  );
}
