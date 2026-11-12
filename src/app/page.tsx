import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { CallBackMenu } from "@/components/call-back-menu";
import { ResumeCard, ResumeCardSkeleton } from "@/components/resume-card";
import { SiteHeader } from "@/components/site-header";
import { focusRing, primaryButton } from "@/components/ui/styles";
import { LOB_META } from "@/lobs/meta";

const STEPS = [
  { title: "Tell us what to cover", body: "A short form about your car, trip, home or family." },
  { title: "Pick a plan", body: "Prices from our partner insurers, worked out from your answers." },
  { title: "Pay, then send documents", body: "Pay online, send a few documents, and your advisor issues the policy." },
] as const;

// Made-up numbers for a demo broker (the footer says every number on the site is made up).
const TRUST = [
  { value: "12,400+", label: "customers helped" },
  { value: "5", label: "partner insurers" },
  { value: "4", label: "lines of cover" },
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-2 md:gap-8 md:pt-16 md:pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
          <div>
            <p className="text-sm font-bold tracking-widest text-pine uppercase">Car · Travel · Home · Health</p>
            <h1 className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-tight text-balance md:text-5xl lg:text-6xl">
              Insurance, the wise way
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted lg:text-xl">
              Car, travel, home and health cover from our partner insurers, with prices worked out from your answers.
              A coordinator helps you choose, and after you pay an advisor sees to the documents with you.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
              <a href="#lines" className={primaryButton}>
                Choose your insurance
                <ArrowRight aria-hidden className="size-5" />
              </a>
              <CallBackMenu />
            </div>
            <dl className="mt-9 grid grid-cols-3 gap-4 sm:flex sm:gap-8">
              {TRUST.map(({ value, label }) => (
                <div key={label} className="flex flex-col">
                  <dt className="order-2 text-sm text-muted">{label}</dt>
                  <dd className="order-1 text-2xl font-extrabold">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {/* The card reads the journey cookie, so only it waits for the request; the rest is prerendered. */}
          <div className="mx-auto w-full max-w-xl md:max-w-none">
            <Suspense fallback={<ResumeCardSkeleton />}>
              <ResumeCard />
            </Suspense>
          </div>
        </section>

        <section id="lines" aria-labelledby="lines-title" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-14">
          <h2 id="lines-title" className="text-2xl font-extrabold tracking-tight md:text-3xl">
            What we cover
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOB_META.map(({ slug, title, tagline, icon: Icon }) => (
              <li key={slug}>
                <Link
                  href={`/${slug}`}
                  className={`group flex h-full flex-col rounded-2xl border border-line bg-card p-5 hover:border-pine ${focusRing}`}
                >
                  <span
                    aria-hidden
                    className="grid size-12 place-items-center rounded-xl bg-pine-soft text-pine group-hover:bg-pine group-hover:text-white"
                  >
                    <Icon className="size-6" />
                  </span>
                  <span className="mt-4 text-lg font-bold">{title}</span>
                  <span className="mt-1 flex-1 text-muted">{tagline}</span>
                  <span className="mt-4 inline-flex items-center gap-1.5 font-semibold text-pine group-hover:underline">
                    Get prices
                    <ArrowRight aria-hidden className="size-4" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how" className="border-t border-line bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-14">
            <h2 id="how" className="text-2xl font-extrabold tracking-tight md:text-3xl">
              How it works
            </h2>
            <ol className="mt-7 grid gap-8 md:grid-cols-3 md:gap-6">
              {STEPS.map(({ title, body }, i) => (
                <li key={title} className="flex flex-col gap-2.5">
                  <span aria-hidden className="grid size-9 place-items-center rounded-full bg-pine font-extrabold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-lg font-bold">{title}</h3>
                  <p className="text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </>
  );
}
