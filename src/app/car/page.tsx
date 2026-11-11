import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Car insurance" };

const CHOICES = [
  {
    href: "/car/details",
    title: "Get prices now",
    body: "Tell us about your car and the driver. Takes about 3 minutes.",
    cta: "Fill in my details",
  },
  {
    href: "/car/quick",
    title: "Call me back",
    body: "Leave your name, number and car. A coordinator calls you to do the rest.",
    cta: "Ask for a call",
  },
] as const;

export default function CarPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 md:py-16">
        <p className="text-sm font-semibold tracking-wide text-pine uppercase">Car insurance</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">Cover for the car you drive</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Compare plans from our partner insurers, or let a coordinator find one with you.
        </p>
        <a
          href="#choose"
          className="mt-6 inline-flex rounded-lg bg-pine px-5 py-3 font-semibold text-white hover:bg-pine-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          Get quotes
        </a>

        <section id="choose" aria-labelledby="choose-title" className="mt-10 scroll-mt-6">
          <h2 id="choose-title" className="text-xl font-bold">
            How would you like to continue?
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {CHOICES.map((choice) => (
              <li key={choice.href}>
                <Link
                  href={choice.href}
                  className="flex h-full flex-col rounded-xl border border-line bg-card p-6 hover:border-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
                >
                  <span className="text-xl font-bold">{choice.title}</span>
                  <span className="mt-2 text-muted">{choice.body}</span>
                  <span className="mt-5 font-semibold text-pine">{choice.cta} →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
