"use client";

import { Mail, Phone } from "lucide-react";
import { type FocusEvent, useEffect, useId, useRef, useState } from "react";
import type { ContactPerson } from "@/lib/contact";
import { primaryButton, secondaryButton } from "./ui/styles";

/**
 * Header badge with an initial avatar, the person's name (first name only on mobile) and their role; a card with Call
 * and Email buttons opens and closes on a click, tap, Enter or Space on the badge, never on hover or focus alone. A click
 * outside, Escape (focus goes back to the badge) or tabbing out of it closes it. Email goes to the help desk inbox (see
 * ContactPerson).
 */
export function ContactCard({ person }: { person: ContactPerson }) {
  const [open, setOpen] = useState(false);
  const cardId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // A click or tap anywhere outside the badge and its card closes the card. Pointer events, as a tap on Safari doesn't
  // move focus, so a blur alone would miss it.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function onBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  }

  return (
    <div
      ref={boxRef}
      className="relative"
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          buttonRef.current?.focus();
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={cardId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pr-3 pl-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-saffron text-sm font-bold text-ink"
        >
          {person.name.charAt(0).toUpperCase()}
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-ink">
            <span className="md:hidden">{person.short}</span>
            <span className="hidden md:inline">{person.name}</span>
          </span>
          <span className="text-xs text-muted">{person.role}</span>
        </span>
      </button>

      <div
        id={cardId}
        hidden={!open}
        className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-card p-4 shadow-lg"
      >
        <p className="font-bold">{person.name}</p>
        <p className="text-sm text-muted">{person.role}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={`tel:${person.phone.replace(/[^\d+]/g, "")}`}
            aria-label={`Call ${person.name} on ${person.phone}`}
            className={primaryButton}
          >
            <Phone aria-hidden className="size-4" />
            Call
          </a>
          <a
            href={person.emailHref}
            aria-label={person.viaHelpDesk ? `Email ${person.name} through the help desk` : `Email the ${person.name}`}
            className={secondaryButton}
          >
            <Mail aria-hidden className="size-4" />
            Email
          </a>
        </div>
        {person.viaHelpDesk && <p className="mt-2 text-xs text-muted">Emails go to our help desk, who pass them on.</p>}
      </div>
    </div>
  );
}
