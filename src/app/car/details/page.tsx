import type { Metadata } from "next";
import { DemoNotice } from "@/components/demo-notice";
import { FullForm } from "@/components/full-form";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Get prices now" };

export default function FullFormPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <div>
          <p className="text-sm font-semibold tracking-wide text-pine uppercase">Car insurance</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Get prices now</h1>
          <p className="mt-2 text-muted">Tell us about your car and the driver. It takes about 3 minutes.</p>
        </div>
        <DemoNotice />
        <FullForm />
      </main>
    </>
  );
}
