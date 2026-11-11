"use client";

import { type FocusEvent, useId, useRef, useState } from "react";
import type { ContactPerson } from "@/lib/contact";

/** Header badge with an initial avatar; a card with the person's details opens on hover, keyboard focus or tap. */
export function ContactCard({ person }: { person: ContactPerson }) {
  const [open, setOpen] = useState(false);
  const cardId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  function onBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
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
        className="flex items-center gap-2 rounded-full border border-line bg-paper py-1 pr-3 pl-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-full bg-saffron text-sm font-bold text-ink"
        >
          {person.name.trim().charAt(0).toUpperCase()}
        </span>
        <span className="text-xs font-bold tracking-wider text-pine-dark uppercase">{person.badge}</span>
      </button>

      <div
        id={cardId}
        hidden={!open}
        className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-line bg-card p-4 shadow-lg"
      >
        <p className="font-bold">{person.name}</p>
        {person.role && <p className="text-sm text-muted">{person.role}</p>}
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          <li>
            <a href={`mailto:${person.email}`} className="text-pine underline underline-offset-2">
              {person.email}
            </a>
          </li>
          <li>
            <a href={`tel:${person.phone.replace(/[^\d+]/g, "")}`} className="text-pine underline underline-offset-2">
              {person.phone}
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
