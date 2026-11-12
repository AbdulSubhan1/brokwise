"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { LOB_META } from "@/lobs/meta";
import { focusRing, secondaryButton } from "./ui/styles";

/**
 * The home hero's "Ask for a call back": a call back is asked per line (its quick form asks about the car, the trip…),
 * so the button opens a short menu of the four lines. Same behaviour as the header's Insurance menu: a click outside,
 * Escape or moving focus away closes it.
 */
export function CallBackMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`${secondaryButton} w-full sm:w-auto md:w-full lg:w-auto`}
      >
        Ask for a call back
        <ChevronDown
          aria-hidden
          className={`size-5 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full left-0 z-20 mt-2 w-full rounded-2xl border border-line bg-card p-2 shadow-xl shadow-ink/10 sm:w-72"
      >
        <p className="px-2.5 pt-1.5 pb-2 text-sm text-muted">Which insurance should we call you about?</p>
        <ul className="flex flex-col gap-1">
          {LOB_META.map(({ slug, title, icon: Icon }) => (
            <li key={slug}>
              <Link
                href={`/${slug}/quick`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl p-2.5 font-semibold text-ink hover:bg-paper ${focusRing}`}
              >
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-pine-soft text-pine">
                  <Icon className="size-5" />
                </span>
                {title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
