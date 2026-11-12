import Link from "next/link";
import type { ReactNode } from "react";
import { HeaderNav } from "./header-nav";
import { focusRing } from "./ui/styles";

/**
 * Top bar: the Brokwise wordmark, the "Insurance" menu with the four lines, the help desk number, and `aside` (the
 * contact card on journey pages). On mobile the menu and the number move into a sheet behind a menu button.
 */
export function SiteHeader({ aside }: { aside?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 md:gap-6">
        <Link
          href="/"
          data-pulse-event="nav_clicked"
          data-pulse-label="home (logo)"
          className={`flex shrink-0 items-center gap-2 rounded-md text-lg font-extrabold tracking-tight text-ink ${focusRing}`}
        >
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-pine text-base text-white">
            B
          </span>
          Brokwise
        </Link>
        <HeaderNav aside={aside} />
      </div>
    </header>
  );
}
