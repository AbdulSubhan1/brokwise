import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { lobFrom } from "@/lobs/from-params";

export async function generateMetadata({ params }: PageProps<"/[lob]">): Promise<Metadata> {
  return { title: (await lobFrom(params)).title };
}

export default async function LobPage({ params }: PageProps<"/[lob]">) {
  const lob = await lobFrom(params);
  const choices = [
    {
      href: `/${lob.slug}/details`,
      title: "Get prices now",
      body: lob.intros.full,
      cta: "Fill in my details",
    },
    {
      href: `/${lob.slug}/quick`,
      title: "Call me back",
      body: lob.intros.quick,
      cta: "Ask for a call",
    },
  ];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 md:py-16">
        <p className="text-sm font-semibold tracking-wide text-pine uppercase">{lob.title}</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-5xl">{lob.landing.heading}</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{lob.landing.intro}</p>
        <section id="choose" aria-labelledby="choose-title" className="mt-10 scroll-mt-6">
          <h2 id="choose-title" className="text-xl font-bold">
            How would you like to continue?
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {choices.map((choice) => (
              <li key={choice.href}>
                <Link
                  href={choice.href}
                  className="flex h-full flex-col rounded-xl border border-line bg-card p-6 hover:border-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
                >
                  <span className="text-xl font-bold">{choice.title}</span>
                  <span className="mt-2 text-muted">{choice.body}</span>
                  <span className="mt-5 font-semibold text-pine">{choice.cta}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
