import { LoaderCircle } from "lucide-react";
import { SiteHeader } from "./site-header";

/** The fallback while a journey page waits for PolicyDesk. */
export function PageLoading({ label, wide = false }: { label: string; wide?: boolean }) {
  return (
    <>
      <SiteHeader />
      <main className={`mx-auto w-full flex-1 px-4 py-10 ${wide ? "max-w-6xl" : "max-w-3xl"}`}>
        <p role="status" className="flex items-center gap-2 text-muted">
          <LoaderCircle aria-hidden className="size-5 animate-spin text-pine motion-reduce:animate-none" />
          {label}
        </p>
      </main>
    </>
  );
}
