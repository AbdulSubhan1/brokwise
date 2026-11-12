"use client";

import { useEffect, useRef, useState } from "react";
import { TURNSTILE_FIELD } from "@/lib/form-state";

// Cloudflare Turnstile's "not a bot" check, shown only when both Turnstile keys are set. The script is loaded once, on
// the first form that needs it, and the widget is rendered explicitly so it also works after client-side navigation.
// The token goes to the server action in a hidden field; the action verifies it with Cloudflare.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not start")));
    script.onerror = () => {
      // Let a later form try again.
      loading = null;
      script.remove();
      reject(new Error("Turnstile could not be loaded"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

export function Turnstile({ siteKey }: { siteKey: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    let widgetId: string | null = null;
    let cancelled = false;

    // A token is good for one check, so each send asks for a fresh one. Deferred so the form reads this token first.
    const form = el.closest("form");
    const onSubmit = () => {
      setTimeout(() => {
        if (widgetId) window.turnstile?.reset(widgetId);
        setToken("");
      }, 0);
    };
    form?.addEventListener("submit", onSubmit);

    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId = api.render(el, {
          sitekey: siteKey,
          "response-field": false,
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      // Without the widget there is no token, and the server action answers with the "not a bot" message.
      .catch(() => {});

    return () => {
      cancelled = true;
      form?.removeEventListener("submit", onSubmit);
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey]);

  return (
    <div>
      <div ref={container} data-sitekey={siteKey} className="min-h-[65px]" />
      <input type="hidden" name={TURNSTILE_FIELD} value={token} />
    </div>
  );
}
