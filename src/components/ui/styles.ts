// Class lists shared by the form controls, so every box, select and button looks and focuses the same way.

export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine";

export const control =
  "block w-full rounded-lg border border-line bg-card px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:border-pine focus:outline-2 focus:outline-pine/30 aria-invalid:border-danger disabled:bg-paper disabled:text-muted";

export const primaryButton = `inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-5 py-3 font-semibold text-white hover:bg-pine-dark disabled:opacity-60 ${focusRing}`;

export const secondaryButton = `inline-flex items-center justify-center gap-2 rounded-lg border border-pine bg-card px-5 py-3 font-semibold text-pine hover:bg-pine-soft ${focusRing}`;

export const textLink = `font-semibold text-pine underline underline-offset-2 hover:text-pine-dark ${focusRing} rounded-sm`;
