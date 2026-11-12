import { type LobConfig, lobForProduct, priceWords } from "@/lobs";
import type { FormValues } from "./form-state";
import { type PlanTag, planTags } from "./plan-tags";
import type { OpportunityView, OrderView, PlansResult, Result } from "./policydesk";

// The home page's quote card shows the visitor's own journey when the journey cookie points to one, and an example
// quote otherwise. This file only decides which card and what goes on it; src/components/resume-card.tsx reads the
// cookie, asks PolicyDesk and draws it.

/** One plan row on the card: insurer, plan, cover and excess, and its price for this visitor. */
export type CardPlan = {
  id: number;
  insurer: string;
  name: string;
  coverLabel: string;
  excess: number;
  price: number;
  /** "a year" or "for this trip" */
  per: string;
  tag?: PlanTag;
};

export type ResumeCard =
  | { kind: "example" }
  /** The quick form was sent: a coordinator calls (null when nobody was free and the help desk does). */
  | { kind: "call_back"; lob: LobConfig; coordinator: string | null }
  /** The full form was sent and no plan is chosen yet: the cheapest plans, up to 3. */
  | {
      kind: "plans";
      lob: LobConfig;
      reference: string;
      /** What was quoted, "Toyota Corolla 2021 · GCC spec · worth $18,000"; left out without the kept answers. */
      subject?: string;
      count: number;
      from: number;
      plans: CardPlan[];
    }
  /** A plan is chosen and not paid yet. */
  | {
      kind: "chosen";
      lob: LobConfig;
      reference: string;
      subject?: string;
      insurer: string;
      planName: string;
      coverLabel: string;
      total: number;
      totalLabel: string;
    }
  /** The order is paid. `plan` is the order's plan line ("Northwind Plus"). */
  | { kind: "paid"; lob: LobConfig; reference: string; plan: string; total: number };

export const EXAMPLE_CARD: ResumeCard = { kind: "example" };

/** How many plans the card lists. */
export const CARD_PLAN_COUNT = 3;

/**
 * What PolicyDesk said about the journey. `view` is null when there is no journey (no cookie, an expired or forged
 * one, an id PolicyDesk doesn't know) or PolicyDesk couldn't be reached. `plans` and `order` are null when they
 * weren't asked for.
 */
export type ResumeInput = {
  view: OpportunityView | null;
  plans: PlansResult | null;
  order: Result<OrderView> | null;
  /** The full form's answers this browser kept for the journey (src/lib/answers.ts), and today as an ISO day. */
  answers?: FormValues | null;
  today?: string;
};

/** How many of the summary's facts the card names after its title: enough to say which car, trip or home. */
const SUBJECT_FACTS = 2;

/**
 * Which card the home page shows, most advanced step first: paid, plan chosen, plans to choose from, call back
 * requested. Anything unexpected (an unknown line, a disqualified request, a failed call, no plans) falls back to the
 * example quietly, so the home page never shows an error.
 */
export function resumeCardFor({ view, plans, order, answers, today = "" }: ResumeInput): ResumeCard {
  if (!view || view.opportunity.status === "disqualified") return EXAMPLE_CARD;
  const lob = lobForProduct(view.opportunity.product);
  if (!lob) return EXAMPLE_CARD;

  if (!view.lead) {
    return { kind: "call_back", lob, coordinator: view.contact?.name.trim() || null };
  }

  if (!order?.ok) return EXAMPLE_CARD;
  const placed = order.data.order;
  if (placed?.status === "paid") {
    return {
      kind: "paid",
      lob,
      reference: placed.quoteReference,
      plan: placed.lines[0]?.label ?? lob.title,
      total: placed.total,
    };
  }

  const summary = answers ? lob.summary(answers, today) : null;
  const subject = summary ? [summary.title, ...summary.facts.slice(0, SUBJECT_FACTS)].join(" · ") : undefined;

  const selection = view.selection;
  if (selection) {
    return {
      kind: "chosen",
      lob,
      reference: selection.quoteReference,
      ...(subject && { subject }),
      insurer: selection.insurer,
      planName: selection.planName,
      coverLabel: selection.coverLabel,
      total: selection.total,
      totalLabel: priceWords(lob, selection.cover).total,
    };
  }

  if (!plans?.ok || plans.plans.length === 0) return EXAMPLE_CARD;
  const tags = planTags(plans.plans, lob.bestValueCover);
  const cheapest = [...plans.plans].sort((a, b) => a.basePremium - b.basePremium).slice(0, CARD_PLAN_COUNT);
  return {
    kind: "plans",
    lob,
    reference: view.lead.reference,
    ...(subject && { subject }),
    count: plans.plans.length,
    from: cheapest[0].basePremium,
    plans: cheapest.map((p) => {
      // One tag per row; "Best value" says more than "Cheapest" when a plan has both.
      const tag = tags.get(p.id)?.includes("best_value") ? "best_value" : tags.get(p.id)?.[0];
      return {
        id: p.id,
        insurer: p.insurer,
        name: p.name,
        coverLabel: p.coverLabel,
        excess: p.excess,
        price: p.basePremium,
        per: priceWords(lob, p.cover).price,
        ...(tag && { tag }),
      };
    }),
  };
}
