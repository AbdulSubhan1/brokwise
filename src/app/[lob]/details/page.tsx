import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoNotice } from "@/components/demo-notice";
import { LobForm } from "@/components/lob-form";
import { PageIntro } from "@/components/page-intro";
import { PageLoading } from "@/components/page-loading";
import { SiteHeader } from "@/components/site-header";
import { Stepper } from "@/components/ui/stepper";
import { readAnswers } from "@/lib/answers";
import { readJourney } from "@/lib/journey";
import { turnstileSiteKey } from "@/lib/turnstile";
import { lobFrom } from "@/lobs/from-params";

export async function generateMetadata({ params }: PageProps<"/[lob]/details">): Promise<Metadata> {
  return { title: `Get prices now · ${(await lobFrom(params)).title}` };
}

export default function FullFormPage({ params }: PageProps<"/[lob]/details">) {
  return (
    <Suspense fallback={<PageLoading label="Loading the form…" />}>
      <FullForm params={params} />
    </Suspense>
  );
}

// The line comes from the URL, so it is read inside <Suspense>: navigations between lines stay instant. Coming back
// from the plans ("Edit details"), the form starts from the answers this journey sent.
async function FullForm({ params }: Pick<PageProps<"/[lob]/details">, "params">) {
  const lob = await lobFrom(params);
  const publicId = await readJourney();
  const answers = publicId ? await readAnswers(lob.slug, publicId) : null;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 md:py-12">
        <Stepper current="details" />
        <PageIntro line={lob} title="Get prices now">
          <p>{lob.intros.full}</p>
        </PageIntro>
        <DemoNotice />
        {/* Keyed by the journey, so coming back from the plans starts a fresh form from its answers instead of the
            one Next kept from the first visit. */}
        <LobForm
          key={answers ? publicId : "new"}
          slug={lob.slug}
          form="full"
          turnstileSiteKey={turnstileSiteKey()}
          initialValues={answers ?? undefined}
        />
      </main>
    </>
  );
}
