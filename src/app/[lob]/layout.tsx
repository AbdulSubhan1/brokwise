import { LOB_SLUGS } from "@/lobs";

// Every line of business shares these pages, and the four known slugs are prerendered. Each page reads its line
// inside <Suspense> (src/lobs/from-params.ts), so navigations stay instant; any other slug (/boat/details) gets the
// 404 page with links to the four lines.
export function generateStaticParams() {
  return LOB_SLUGS.map((lob) => ({ lob }));
}

export default function LobLayout({ children }: LayoutProps<"/[lob]">) {
  return children;
}
