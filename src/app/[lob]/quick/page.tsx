import type { Metadata } from "next";
import { DemoNotice } from "@/components/demo-notice";
import { LobForm } from "@/components/lob-form";
import { PageIntro } from "@/components/page-intro";
import { SiteHeader } from "@/components/site-header";
import { Stepper } from "@/components/ui/stepper";
import { turnstileSiteKey } from "@/lib/turnstile";
import { lobFrom } from "@/lobs/from-params";

export async function generateMetadata({ params }: PageProps<"/[lob]/quick">): Promise<Metadata> {
  return { title: `Call me back · ${(await lobFrom(params)).title}` };
}

export default async function QuickFormPage({ params }: PageProps<"/[lob]/quick">) {
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
