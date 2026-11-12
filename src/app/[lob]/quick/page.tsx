import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoNotice } from "@/components/demo-notice";
import { LobForm } from "@/components/lob-form";
import { PageIntro } from "@/components/page-intro";
import { PageLoading } from "@/components/page-loading";
import { SiteHeader } from "@/components/site-header";
import { Stepper } from "@/components/ui/stepper";
import { turnstileSiteKey } from "@/lib/turnstile";
import { lobFrom } from "@/lobs/from-params";

export async function generateMetadata({ params }: PageProps<"/[lob]/quick">): Promise<Metadata> {
  return { title: `Call me back · ${(await lobFrom(params)).title}` };
}

export default function QuickFormPage({ params }: PageProps<"/[lob]/quick">) {
  return (
    <Suspense fallback={<PageLoading label="Loading the form…" />}>
      <QuickForm params={params} />
    </Suspense>
  );
}

// The line comes from the URL, so it is read inside <Suspense>: navigations between lines stay instant.
async function QuickForm({ params }: Pick<PageProps<"/[lob]/quick">, "params">) {
  const lob = await lobFrom(params);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <Stepper current="details" />
        <PageIntro line={lob} title="Call me back">
          <p>{lob.intros.quick}</p>
        </PageIntro>
        <DemoNotice />
        <LobForm slug={lob.slug} form="short" turnstileSiteKey={turnstileSiteKey()} />
      </main>
    </>
  );
}
