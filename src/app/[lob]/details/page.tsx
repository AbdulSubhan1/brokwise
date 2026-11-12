import type { Metadata } from "next";
import { DemoNotice } from "@/components/demo-notice";
import { LobForm } from "@/components/lob-form";
import { SiteHeader } from "@/components/site-header";
import { turnstileSiteKey } from "@/lib/turnstile";
import { lobFrom } from "@/lobs/from-params";

export async function generateMetadata({ params }: PageProps<"/[lob]/details">): Promise<Metadata> {
  return { title: `Get prices now · ${(await lobFrom(params)).title}` };
}

export default async function FullFormPage({ params }: PageProps<"/[lob]/details">) {
  const lob = await lobFrom(params);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <div>
          <p className="text-sm font-semibold tracking-wide text-pine uppercase">{lob.title}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Get prices now</h1>
          <p className="mt-2 text-muted">{lob.intros.full}</p>
        </div>
        <DemoNotice />
        <LobForm slug={lob.slug} form="full" turnstileSiteKey={turnstileSiteKey()} />
      </main>
    </>
  );
}
