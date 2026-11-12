// The first path segments Brokwise serves: the four lines (src/lobs), the pay-link pages and the terms page. Kept as plain strings, not
// imported from src/lobs, so the proxy stays free of forms and icons; top-level-routes.test.ts checks they match.
const TOP_LEVEL = new Set(["car", "travel", "home", "health", "pay", "terms"]);

/**
 * Next's own build of src/app/not-found.tsx, prerendered with a 404 status. The proxy shows it for paths that aren't
 * ours. A page of our own would not do: a prerendered page keeps the 200 it was built with, whatever the proxy says.
 */
export const NOT_FOUND_PAGE = "/_not-found";

/**
 * Whether a path's first segment is one of ours. The home page, Next's internals (`_next`, `__nextjs_…`) and files
 * (anything with a dot, like favicon.ico) count as ours, so the proxy leaves them to Next.
 */
export function isKnownTopLevel(pathname: string): boolean {
  const first = pathname.split("/")[1] ?? "";
  return first === "" || first.startsWith("_") || first.includes(".") || TOP_LEVEL.has(first);
}
