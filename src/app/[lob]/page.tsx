import { Check, ListChecks, PhoneCall } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PageLoading } from "@/components/page-loading";
import { SiteHeader } from "@/components/site-header";
import { lobFrom } from "@/lobs/from-params";

export async function generateMetadata({ params }: PageProps<"/[lob]">): Promise<Metadata> {
  return { title: (await lobFrom(params)).title };
}

export default function LobPage({ params }: PageProps<"/[lob]">) {
  return (
    <Suspense fallback={<PageLoading label="Loading…" wide />}>
      <Lob params={params} />
    </Suspense>
  );
}

// The line comes from the URL, so it is read inside <Suspense>: navigations between lines stay instant.
async function Lob({ params }: Pick<PageProps<"/[lob]">, "params">) {
  const lob = await lobFrom(params);
  const Icon = lob.icon;
  const choices = [
    {
      href: `/${lob.slug}/details`,
      icon: ListChecks,
      title: "Get prices now",
      body: lob.intros.full,
      cta: "Fill in my details",
      primary: true,
    },
    {
      href: `/${lob.slug}/quick`,
      icon: PhoneCall,
      title: "Call me back",
      body: lob.intros.quick,
      cta: "Ask for a call",
      primary: false,
    },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div>
            <span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-pine text-white">
              <Icon className="size-7" />
            </span>
            <p className="mt-5 font-semibold text-pine">{lob.title}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-balance md:text-5xl">{lob.landing.heading}</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">{lob.landing.intro}</p>
          </div>

          <section aria-labelledby="covered" className="rounded-2xl border border-line bg-card p-5 md:p-6">
            <h2 id="covered" className="text-lg font-bold">
              What&apos;s covered
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {lob.landing.covered.map((item) => (
                <li key={item} className="flex gap-3">
                  <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-pine-soft text-pine">
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-muted">What each plan covers depends on the insurer and the cover you pick.</p>
          </section>
        </div>

        <section id="choose" aria-labelledby="choose-title" className="mt-12 scroll-mt-24">
          <h2 id="choose-title" className="text-xl font-bold">
            How would you like to continue?
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {choices.map(({ href, icon: ChoiceIcon, title, body, cta, primary }) => (
              <li key={href}>
                <Link
                  href={href}
                  data-pulse-event="journey_chosen"
                  data-pulse-label={`${lob.slug}: ${title}`}
                  className={`group flex h-full flex-col rounded-2xl border-2 p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine ${
                    primary ? "border-pine bg-card hover:bg-pine-soft" : "border-line bg-card hover:border-pine"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid size-11 place-items-center rounded-xl ${primary ? "bg-pine text-white" : "bg-pine-soft text-pine"}`}
                  >
                    <ChoiceIcon className="size-5" />
                  </span>
                  <span className="mt-4 text-xl font-bold">{title}</span>
                  <span className="mt-2 flex-1 text-muted">{body}</span>
                  <span className="mt-5 font-semibold text-pine group-hover:underline">{cta}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
