import { Headset, Link2Off, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { HELP_DESK } from "@/lib/contact";
import { SiteHeader } from "./site-header";
import { Card } from "./ui/card";
import { textLink } from "./ui/styles";

/** Page body for a pay link that can't be used: what happened, what to do, and how to reach the help desk. */
export function PayLinkProblem({ title, body }: { title: string; body: string }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10 md:py-16">
        <div className="flex flex-col gap-3">
          <span aria-hidden className="grid size-12 place-items-center rounded-full bg-saffron-soft text-ink">
            <Link2Off className="size-6" />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
          <p className="text-lg">{body}</p>
        </div>

        <Card aria-labelledby="help">
          <h2 id="help" className="flex items-center gap-2 text-lg font-bold">
            <Headset aria-hidden className="size-5 text-pine" />
            Need help?
          </h2>
          <p className="mt-2 text-muted">The {HELP_DESK.name} can put you in touch with your coordinator.</p>
          <ul className="mt-3 flex flex-col gap-2">
            <li className="flex items-center gap-2">
              <Mail aria-hidden className="size-4 text-muted" />
              <a href={`mailto:${HELP_DESK.email}`} className="text-pine underline underline-offset-2">
                {HELP_DESK.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Phone aria-hidden className="size-4 text-muted" />
              <a
                href={`tel:${HELP_DESK.phone.replace(/[^\d+]/g, "")}`}
                className="text-pine underline underline-offset-2"
              >
                {HELP_DESK.phone}
              </a>
            </li>
          </ul>
        </Card>

        <Link href="/" className={`w-fit ${textLink}`}>
          Back to home
        </Link>
      </main>
    </>
  );
}
