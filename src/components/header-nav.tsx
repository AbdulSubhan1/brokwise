"use client";

import { ChevronDown, Headset, Menu, X } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { HELP_DESK } from "@/lib/contact";
import { LOB_META } from "@/lobs/meta";
import { focusRing } from "./ui/styles";

const TEL = `tel:${HELP_DESK.phone.replace(/[^\d+]/g, "")}`;

/** The header's menus: a dropdown on desktop, a sheet (a modal dialog) on mobile. */
export function HeaderNav({ aside }: { aside?: ReactNode }) {
  return (
    <>
      <InsuranceMenu />
      <a
        href={TEL}
        data-pulse-event="help_desk_called"
        data-pulse-label="header"
        className={`hidden items-center gap-2 rounded-md text-sm font-semibold text-ink hover:text-pine md:flex ${focusRing}`}
      >
        <Headset aria-hidden className="size-5 text-pine" />
        <span className="sr-only">Help desk: </span>
        {HELP_DESK.phone}
      </a>
      <div className="ml-auto flex items-center gap-2">
        {aside}
        <MobileSheet />
      </div>
    </>
  );
}

function LineLinks({ onPick }: { onPick?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {LOB_META.map(({ slug, title, tagline, icon: Icon }) => (
        <li key={slug}>
          <Link
            href={`/${slug}`}
            onClick={onPick}
            data-pulse-event="nav_clicked"
            data-pulse-label={slug}
            className={`flex items-start gap-3 rounded-xl p-2.5 hover:bg-paper ${focusRing}`}
          >
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-lg bg-pine-soft text-pine">
              <Icon className="size-5" />
            </span>
            <span className="flex flex-col">
              <span className="font-semibold text-ink">{title}</span>
              <span className="text-sm text-muted">{tagline}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function InsuranceMenu() {
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
      className="relative hidden md:block"
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
        data-pulse-event="nav_menu_opened"
        data-pulse-label="insurance (desktop)"
        className={`flex items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold text-ink hover:text-pine ${focusRing}`}
      >
        Insurance
        <ChevronDown
          aria-hidden
          className={`size-4 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute top-full left-0 z-40 mt-2 w-96 rounded-2xl border border-line bg-card p-2 shadow-xl shadow-ink/10"
      >
        <LineLinks onPick={() => setOpen(false)} />
      </div>
    </div>
  );
}

function MobileSheet() {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
        data-pulse-event="nav_menu_opened"
        data-pulse-label="mobile"
        className={`grid size-10 place-items-center rounded-lg border border-line text-ink md:hidden ${focusRing}`}
      >
        <Menu aria-hidden className="size-5" />
      </button>
      <dialog
        ref={dialog}
        aria-label="Menu"
        // A tap on the backdrop (outside the panel) closes the sheet.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        className="m-0 ml-auto h-dvh max-h-none w-[88vw] max-w-sm bg-card p-0 text-ink backdrop:bg-ink/40 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="text-lg font-extrabold tracking-tight">Insurance</span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={close}
            className={`grid size-10 place-items-center rounded-lg text-ink hover:bg-paper ${focusRing}`}
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <nav aria-label="Insurance" className="flex-1 overflow-y-auto p-2">
          <LineLinks onPick={close} />
        </nav>
        <div className="border-t border-line p-4">
          <p className="text-sm text-muted">Questions? Call the {HELP_DESK.name}.</p>
          <a
            href={TEL}
            data-pulse-event="help_desk_called"
            data-pulse-label="mobile menu"
            className={`mt-2 flex items-center gap-2 rounded-md font-semibold text-pine ${focusRing}`}
          >
            <Headset aria-hidden className="size-5" />
            {HELP_DESK.phone}
          </a>
        </div>
      </dialog>
    </>
  );
}
