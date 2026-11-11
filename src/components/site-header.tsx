import Link from "next/link";
import type { ReactNode } from "react";

/** Top bar with the Brokwise wordmark. `aside` holds the contact card on journey pages. */
export function SiteHeader({ aside }: { aside?: ReactNode }) {
  return (
    <header className="border-b border-line bg-card">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 rounded-md text-lg font-extrabold tracking-tight text-ink">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-pine text-base text-white">
            B
          </span>
          Brokwise
        </Link>
        {aside}
      </div>
    </header>
  );
}
