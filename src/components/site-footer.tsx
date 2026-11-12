import { Lock } from "lucide-react";
import Link from "next/link";
import { HELP_DESK } from "@/lib/contact";
import { LOB_META } from "@/lobs/meta";

// The insurers PolicyDesk sells, all made up.
const PARTNERS = [
  "Bluepeak Insurance",
  "Crescent Cover",
  "Harbor Mutual",
  "Northwind Assurance",
  "Summit General",
] as const;

const link =
  "rounded-sm underline-offset-2 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron";

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper/80">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:py-12">
        <div>
          <p className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
            <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-saffron text-base text-ink">
              B
            </span>
            Brokwise
          </p>
          <p className="mt-3 max-w-xs text-sm">
            A demo insurance broker. We compare plans from partner insurers and a coordinator helps you choose.
          </p>
        </div>

        <nav aria-labelledby="footer-insurance">
          <h2 id="footer-insurance" className="font-semibold text-white">
            Insurance
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {LOB_META.map((l) => (
              <li key={l.slug}>
                <Link href={`/${l.slug}`} data-pulse-event="line_selected" data-pulse-label={`footer: ${l.slug}`} className={link}>
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-semibold text-white">Partner insurers</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {PARTNERS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-semibold text-white">Help desk</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li>
              <a href={`mailto:${HELP_DESK.email}`} data-pulse-event="help_desk_emailed" data-pulse-label="footer" className={link}>
                {HELP_DESK.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${HELP_DESK.phone.replace(/[^\d+]/g, "")}`}
                data-pulse-event="help_desk_called"
                data-pulse-label="footer"
                className={link}
              >
                {HELP_DESK.phone}
              </a>
            </li>
            <li>Every day, 9 am to 9 pm</li>
            <li>
              <Link href="/terms" data-pulse-event="terms_opened" data-pulse-label="footer" className={link}>
                Terms and conditions
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-xs md:flex-row md:items-center md:justify-between">
          <p className="flex items-center gap-1.5">
            <Lock aria-hidden className="size-3.5 text-saffron" />
            Payments by PaySandbox · test mode
          </p>
          <p>© Brokwise. Every name, insurer and number on this site is made up.</p>
        </div>
      </div>
    </footer>
  );
}
