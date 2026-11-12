import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import Script from "next/script";
import { SiteFooter } from "@/components/site-footer";
import { PULSE_URL } from "@/lib/pulse";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Brokwise · Insurance, the wise way", template: "%s · Brokwise" },
  description:
    "Brokwise is a demo insurance broker. Compare car, travel, home and health insurance or ask a coordinator to call you back.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <div className="flex flex-1 flex-col">{children}</div>
        <SiteFooter />
        {/* Pulse: cookie-free page views, named events and browser errors (github.com/AbdulSubhan1/monitor) */}
        <Script src={`${PULSE_URL}/beacon.js`} data-project="brokwise" strategy="afterInteractive" />
      </body>
    </html>
  );
}
