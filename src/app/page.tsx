import { BadgeCheck, ClipboardList, CreditCard, Headset, Scale, ShieldCheck, Star, Users } from "lucide-react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { LOB_META } from "@/lobs/meta";

const STEPS = [
  { icon: ClipboardList, title: "Tell us what to cover", body: "A short form about your car, trip, home or family." },
  { icon: Scale, title: "Compare plans", body: "Prices from our partner insurers, with add-ons you choose." },
  { icon: CreditCard, title: "Pay and meet your advisor", body: "Pay online and an advisor takes care of the documents." },
] as const;

// Made-up numbers for a demo broker.
const TRUST = [
  { icon: Users, value: "12,400+", label: "customers helped" },
  { icon: ShieldCheck, value: "18", label: "partner insurers" },
  { icon: Star, value: "4.8 / 5", label: "average rating" },
  { icon: Headset, value: "Personal", label: "coordinator for every request" },
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-10 pb-12 md:grid-cols-[1.1fr_1fr] md:pt-16 md:pb-20">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-balance md:text-6xl">Insurance, the wise way</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Tell us about what you want to protect. We compare plans from our partner insurers and a coordinator
              helps you choose.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="#lines" className={primaryButton}>
                Choose your insurance
              </a>
              <Link href="/car" className={secondaryButton}>
                Start with car insurance
              </Link>
            </div>
          </div>
          <HeroTiles />
        </section>

        <section aria-labelledby="lines" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-14">
          <h2 id="lines" className="text-2xl font-bold tracking-tight">
            What we cover
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LOB_META.map(({ slug, title, tagline, icon: Icon }) => (
              <li key={slug}>
                <Link
                  href={`/${slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 hover:border-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
                >
                  <span
                    aria-hidden
                    className="grid size-12 place-items-center rounded-xl bg-pine-soft text-pine group-hover:bg-pine group-hover:text-white"
                  >
                    <Icon className="size-6" />
                  </span>
                  <span className="mt-4 text-lg font-bold">{title}</span>
                  <span className="mt-1 flex-1 text-muted">{tagline}</span>
                  <span className="mt-4 font-semibold text-pine group-hover:underline">Get prices</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how" className="border-y border-line bg-card">
          <div className="mx-auto w-full max-w-6xl px-4 py-12">
            <h2 id="how" className="text-2xl font-bold tracking-tight">
              How it works
            </h2>
            <ol className="mt-6 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="flex gap-4">
                  <span aria-hidden className="relative grid size-12 shrink-0 place-items-center rounded-full bg-pine text-white">
                    <Icon className="size-5" />
                    <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-saffron text-xs font-bold text-ink">
                      {i + 1}
                    </span>
                  </span>
                  <div>
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section aria-label="Brokwise in numbers" className="bg-pine-soft">
          <dl className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-8 lg:grid-cols-4">
            {TRUST.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon aria-hidden className="size-7 shrink-0 text-pine" />
                <div className="flex flex-col">
                  <dt className="order-2 text-sm text-muted">{label}</dt>
                  <dd className="order-1 text-xl font-extrabold text-pine-dark">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}

/** The hero's picture: the four lines as tiles, sealed with Brokwise's tick. Decorative. */
function HeroTiles() {
  const tones = ["bg-pine text-white", "bg-card text-pine", "bg-saffron text-ink", "bg-ink text-saffron"];
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-72 pt-2 pb-6 sm:max-w-sm md:max-w-md">
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        {LOB_META.map(({ slug, name, icon: Icon }, i) => (
          <div
            key={slug}
            className={`flex aspect-square flex-col justify-between rounded-3xl border border-line p-4 md:p-5 ${tones[i]} ${
              i % 2 === 1 ? "translate-y-6" : ""
            }`}
          >
            <Icon className="size-9 md:size-11" strokeWidth={1.75} />
            <span className="text-lg font-bold md:text-xl">{name}</span>
          </div>
        ))}
      </div>
      <span className="absolute -top-3 -right-3 grid size-14 place-items-center rounded-full border-4 border-paper bg-saffron text-ink shadow-lg md:size-20">
        <BadgeCheck className="size-7 md:size-10" />
      </span>
    </div>
  );
}
