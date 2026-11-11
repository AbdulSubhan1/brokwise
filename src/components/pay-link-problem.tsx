import Link from "next/link";
import { HELP_DESK } from "@/lib/contact";
import { SiteHeader } from "./site-header";

/** Page body for a pay link that can't be used: what happened, what to do, and how to reach the help desk. */
export function PayLinkProblem({ title, body }: { title: string; body: string }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 md:py-16">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
          <p className="text-lg">{body}</p>
        </div>

        <section aria-labelledby="help" className="rounded-xl border border-line bg-card p-5 md:p-6">
          <h2 id="help" className="text-lg font-bold">
            Need help?
          </h2>
          <p className="mt-2 text-muted">The {HELP_DESK.name} can put you in touch with your coordinator.</p>
          <ul className="mt-3 flex flex-col gap-1">
            <li>
              <a href={`mailto:${HELP_DESK.email}`} className="text-pine underline underline-offset-2">
                {HELP_DESK.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${HELP_DESK.phone.replace(/[^\d+]/g, "")}`}
                className="text-pine underline underline-offset-2"
              >
                {HELP_DESK.phone}
              </a>
            </li>
          </ul>
        </section>

        <Link href="/" className="w-fit font-semibold text-pine underline underline-offset-2">
          Back to home
        </Link>
      </main>
    </>
  );
}
