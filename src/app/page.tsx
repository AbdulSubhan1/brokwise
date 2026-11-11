import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

const LINES = [
  { name: "Car", blurb: "Comprehensive or third party, for the car you drive every day.", href: "/car" },
  { name: "Health", blurb: "Cover for you and your family." },
  { name: "Home", blurb: "Your building and what is inside it." },
  { name: "Travel", blurb: "Trips, delays and medical care abroad." },
  { name: "Business", blurb: "Property, liability and staff cover." },
] as const;

// Made-up numbers for a demo broker.
const TRUST = [
  { value: "12,400+", label: "drivers helped" },
  { value: "18", label: "partner insurers" },
  { value: "4.8 / 5", label: "average rating" },
] as const;

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-8 md:pt-16 md:pb-12">
          <p className="text-sm font-semibold tracking-wide text-pine uppercase">Insurance broker</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-6xl">Insurance, the wise way</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Tell us about what you want to protect. We compare plans from our partner insurers and a coordinator helps
            you choose.
          </p>
          <Link
            href="/car"
            className="mt-6 inline-flex rounded-lg bg-pine px-5 py-3 font-semibold text-white hover:bg-pine-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
          >
            Start with car insurance
          </Link>
        </section>

        <section aria-labelledby="lines" className="mx-auto w-full max-w-5xl px-4 pb-10">
          <h2 id="lines" className="text-xl font-bold">
            What we cover
          </h2>
          <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {LINES.map((line) => (
              <li key={line.name}>
                {"href" in line ? (
                  <Link
                    href={line.href}
                    className="flex h-full flex-col rounded-xl border-2 border-pine bg-card p-5 hover:bg-pine-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
                  >
                    <span className="text-lg font-bold">{line.name} insurance</span>
                    <span className="mt-1 text-muted">{line.blurb}</span>
                    <span className="mt-4 font-semibold text-pine">Get quotes →</span>
                  </Link>
                ) : (
                  <div className="flex h-full flex-col rounded-xl border border-line bg-card/60 p-5 text-muted">
                    <span className="text-lg font-bold text-ink/70">{line.name} insurance</span>
                    <span className="mt-1">{line.blurb}</span>
                    <span className="mt-4 w-fit rounded-full bg-line/60 px-3 py-1 text-xs font-semibold">
                      Coming soon
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Brokwise in numbers" className="border-y border-line bg-pine-soft">
          <dl className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-6 md:grid-cols-3">
            {TRUST.map((item) => (
              <div key={item.label} className="flex items-baseline gap-2 md:flex-col md:gap-0">
                <dt className="order-2 text-muted">{item.label}</dt>
                <dd className="order-1 text-2xl font-extrabold text-pine-dark">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </>
  );
}
