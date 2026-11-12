import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { LOB_META } from "@/lobs/meta";

export const metadata: Metadata = { title: "Page not found" };

/** Unknown pages, including a line we don't sell (/boat/details): where to go instead. */
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12 md:py-20">
        <div>
          <p className="text-5xl font-extrabold tracking-tight text-pine">404</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">We can&apos;t find that page</h1>
          <p className="mt-2 text-lg text-muted">We sell four kinds of insurance. Pick one to get prices.</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {LOB_META.map(({ slug, title, icon: Icon }) => (
            <li key={slug}>
              <Link
                href={`/${slug}`}
                data-pulse-event="line_selected"
                data-pulse-label={`not found: ${slug}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-4 font-semibold hover:border-pine focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
              >
                <span aria-hidden className="grid size-10 place-items-center rounded-xl bg-pine-soft text-pine">
                  <Icon className="size-5" />
                </span>
                {title}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/"
          data-pulse-event="back_home_clicked"
          data-pulse-label="not found"
          className="w-fit font-semibold text-pine underline underline-offset-2">
          Back to home
        </Link>
      </main>
    </>
  );
}
