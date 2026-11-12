import type { Metadata } from "next";
import { PayLinkProblem } from "@/components/pay-link-problem";

export const metadata: Metadata = { title: "Link expired", robots: { index: false } };

export default function PayLinkExpiredPage() {
  return (
    <PayLinkProblem
      title="Link expired"
      body="This payment link has expired. Ask your coordinator for a new one."
    />
  );
}
