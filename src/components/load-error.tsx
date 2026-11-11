"use client";

import { SiteHeader } from "./site-header";

/** Body of a journey page's error.tsx: what failed, what still holds, and a retry button. */
export function LoadError({ title, body, retry }: { title: string; body: string; retry: () => void }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted">{body}</p>
        <button
          type="button"
          onClick={() => retry()}
          className="w-fit rounded-lg bg-pine px-5 py-3 font-semibold text-white hover:bg-pine-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          Try again
        </button>
      </main>
    </>
  );
}
