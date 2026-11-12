import type { Metadata } from "next";
import { DemoNotice } from "@/components/demo-notice";
import { QuickForm } from "@/components/quick-form";
import { SiteHeader } from "@/components/site-header";
import { turnstileSiteKey } from "@/lib/turnstile";

export const metadata: Metadata = { title: "Call me back" };

export default function QuickFormPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <div>
          <p className="text-sm font-semibold tracking-wide text-pine uppercase">Car insurance</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Call me back</h1>
          <p className="mt-2 text-muted">Leave a few details and a coordinator will call you to find a plan.</p>
        </div>
        <DemoNotice />
        <QuickForm turnstileSiteKey={turnstileSiteKey()} />
      </main>
    </>
  );
}
