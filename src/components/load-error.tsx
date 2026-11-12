"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { SiteHeader } from "./site-header";
import { primaryButton } from "./ui/styles";

/** Body of a journey page's error.tsx: what failed, what still holds, and a retry button. */
export function LoadError({ title, body, retry }: { title: string; body: string; retry: () => void }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10 md:py-16">
        <span aria-hidden className="grid size-12 place-items-center rounded-full bg-saffron-soft text-ink">
          <TriangleAlert className="size-6" />
        </span>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        <p className="text-muted">{body}</p>
        <button type="button" onClick={() => retry()} className={`${primaryButton} w-fit`}>
          <RotateCcw aria-hidden className="size-5" />
          Try again
        </button>
      </main>
    </>
  );
}
