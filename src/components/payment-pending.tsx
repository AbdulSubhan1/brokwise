"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const EVERY_MS = 3_000;
const MAX_CHECKS = 10; // 10 × 3 s = 30 s

/**
 * Shown while PolicyDesk has not yet seen the payment (its webhook can be late). Re-reads the page every 3 seconds;
 * each read makes PolicyDesk re-check the PaySandbox session. When the order turns paid the page swaps this out.
 * After 30 seconds it stops and says the coordinator will confirm.
 */
export function PaymentPending() {
  const router = useRouter();
  const [checks, setChecks] = useState(0);
  const gaveUp = checks >= MAX_CHECKS;

  useEffect(() => {
    if (gaveUp) return;
    const timer = setTimeout(() => {
      router.refresh();
      setChecks((n) => n + 1);
    }, EVERY_MS);
    return () => clearTimeout(timer);
  }, [checks, gaveUp, router]);

  return (
    <p role="status" className="rounded-lg border border-line bg-card px-4 py-3">
      {gaveUp
        ? "This is taking longer than usual. Your coordinator will confirm by email."
        : "We're checking with PaySandbox. This page updates by itself."}
    </p>
  );
}
