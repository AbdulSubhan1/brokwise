import { notFound, redirect } from "next/navigation";
import { getLob } from "./index";
import type { LobConfig } from "./types";

/** The line of a /[lob] page, or the 404 page for a slug we don't sell. */
export async function lobFrom(params: Promise<{ lob: string }>): Promise<LobConfig> {
  return getLob((await params).lob) ?? notFound();
}

/**
 * A journey belongs to one line. When the visitor opens another line's page (a travel journey on /car/plans), send
 * them to the same step of their own line.
 */
export function stayInOwnLine(product: string, lob: LobConfig, step: string): void {
  const own = getLob(product);
  if (own && own.slug !== lob.slug) redirect(`/${own.slug}/${step}`);
}
