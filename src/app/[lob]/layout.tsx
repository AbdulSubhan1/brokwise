import { notFound } from "next/navigation";
import { getLob, LOB_SLUGS } from "@/lobs";

// Every line of business shares these pages. The four known slugs are prerendered; any other slug (/boat/details)
// is a 404 with links to the four lines, before a page is drawn.
export function generateStaticParams() {
  return LOB_SLUGS.map((lob) => ({ lob }));
}

export default async function LobLayout({ children, params }: LayoutProps<"/[lob]">) {
  if (!getLob((await params).lob)) notFound();
  return children;
}
