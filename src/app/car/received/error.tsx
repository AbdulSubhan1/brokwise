"use client";

import { SiteHeader } from "@/components/site-header";

export default function ReceivedError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-10">
        <h1 className="text-2xl font-bold">We couldn&apos;t load your request</h1>
        <p className="text-muted">Your request was sent. We just can&apos;t show it right now. Please try again.</p>
        <button
          type="button"
          onClick={() => retry()}
          className="w-fit rounded-lg bg-pine px-5 py-3 font-semibold text-white hover:bg-pine-dark"
        >
          Try again
        </button>
      </main>
    </>
  );
}
