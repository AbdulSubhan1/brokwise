"use client";

import { CircleCheck, Info, LoaderCircle, ScanLine } from "lucide-react";
import { useId, useState } from "react";
import { type CarMatch, matchCar, REGREAD_SAMPLE, REGREAD_URL, scanWithRegRead } from "@/lib/regread";
import { shrinkImage } from "@/lib/shrink-image";
import { secondaryButton, textLink } from "./ui/styles";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_BYTES = 4 * 1024 * 1024;

type Status =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "done"; summary: string; notes: string[] }
  | { kind: "error"; message: string };

const ERRORS: Record<number, string> = {
  400: "That file can't be read. Use a JPG, PNG or WebP photo, or a PDF, under 4 MB.",
  429: "The card reader has reached today's limit. Please fill in the fields.",
};
const FALLBACK_ERROR = "We couldn't read the card right now. Please fill in the fields.";

/** "Scan your registration card": fills make, model and year from a photo through RegRead. The visitor checks them. */
export function ScanCard({ onFill }: { onFill: (values: CarMatch["values"]) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function scan(body: FormData) {
    setStatus({ kind: "reading" });
    const answer = await scanWithRegRead(body);
    if (!answer.ok) return setStatus({ kind: "error", message: ERRORS[answer.status] ?? FALLBACK_ERROR });
    const { values, notes } = matchCar(answer.result);
    onFill(values);
    const summary = [values.make, values.model, values.year].filter(Boolean).join(" ");
    setStatus({ kind: "done", summary, notes });
  }

  async function onFile(file: File) {
    if (!ACCEPTED.includes(file.type)) return setStatus({ kind: "error", message: ERRORS[400] });
    const image = await shrinkImage(file);
    if (image.size > MAX_BYTES) return setStatus({ kind: "error", message: ERRORS[400] });
    const body = new FormData();
    body.append("file", image, file.type === "application/pdf" ? file.name : "card.jpg");
    await scan(body);
  }

  function trySample() {
    const body = new FormData();
    body.append("sampleId", REGREAD_SAMPLE);
    void scan(body);
  }

  const reading = status.kind === "reading";

  if (!open) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-dashed border-pine/50 bg-pine-soft/40 p-4 md:col-span-2 md:flex-row md:items-center">
        <ScanLine aria-hidden className="size-6 shrink-0 text-pine" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Scan your registration card</p>
          <p className="text-sm text-muted">We fill in the make, model and year from a photo. You check them.</p>
        </div>
        <button type="button" className={secondaryButton} onClick={() => setOpen(true)} data-pulse-event="scan_card_open">
          Scan card
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-4 md:col-span-2">
      <p className="flex items-center gap-2 font-semibold">
        <ScanLine aria-hidden className="size-5 text-pine" />
        Scan your registration card
      </p>
      <p className="mt-2 flex items-start gap-2 text-sm text-muted">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          Your photo is read by{" "}
          <a href={REGREAD_URL} target="_blank" rel="noreferrer" className={textLink}>
            RegRead
          </a>{" "}
          using Google&apos;s Gemini AI. On the free plan Google may use it to improve its products. It isn&apos;t kept.
          Not comfortable? Try a sample card instead.
        </span>
      </p>
      <label htmlFor={`${id}-consent`} className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
        <input
          id={`${id}-consent`}
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-pine"
        />
        I understand
      </label>
      <div className="mt-3 flex flex-col gap-2 md:flex-row">
        <label
          htmlFor={`${id}-file`}
          aria-disabled={!consent || reading}
          className={`${secondaryButton} cursor-pointer aria-disabled:cursor-not-allowed aria-disabled:opacity-60`}
          onClick={(e) => {
            if (!consent) {
              e.preventDefault();
              setStatus({ kind: "error", message: "Tick “I understand” before sending your own card." });
              document.getElementById(`${id}-consent`)?.focus();
            }
          }}
        >
          Choose a photo or PDF
        </label>
        <input
          id={`${id}-file`}
          type="file"
          accept={ACCEPTED.join(",")}
          disabled={!consent || reading}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void onFile(file);
          }}
        />
        <button type="button" className={secondaryButton} disabled={reading} onClick={trySample} data-pulse-event="scan_card_sample">
          Try a sample card
        </button>
      </div>
      <div aria-live="polite" className="mt-3 text-sm">
        {reading && (
          <p className="flex items-center gap-2 text-muted">
            <LoaderCircle aria-hidden className="size-4 animate-spin" /> Reading the card…
          </p>
        )}
        {status.kind === "done" && (
          <div className="space-y-1">
            {status.summary && (
              <p className="flex items-start gap-2 font-medium text-pine">
                <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                From your card, please check: {status.summary}
              </p>
            )}
            {status.notes.map((n) => (
              <p key={n} className="text-ink">
                {n}
              </p>
            ))}
          </div>
        )}
        {status.kind === "error" && (
          <p role="alert" className="font-medium text-danger">
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
