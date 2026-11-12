import { redirect } from "next/navigation";
import { setJourney } from "@/lib/journey";
import { isPayToken } from "@/lib/pay-link";
import { getOpportunity, openPayLink } from "@/lib/policydesk";
import { lobForProduct } from "@/lobs";

// A coordinator's private payment link. PolicyDesk says which journey the token belongs to; the browser then holds
// that journey's cookie and goes through the same payment and thank-you pages as a self-serve visitor. A link that
// can't be opened sets no cookie.
export async function GET(_req: Request, ctx: RouteContext<"/pay/[token]">) {
  const { token } = await ctx.params;
  // Only a well-formed token is sent to PolicyDesk.
  if (!isPayToken(token)) redirect("/pay/invalid");

  const result = await openPayLink(token);
  if (result.ok) {
    await setJourney(result.publicId);
    const base = await lineOf(result.publicId);
    redirect(result.status === "paid" ? `${base}/thank-you` : `${base}/payment`);
  }
  if (result.status === 410) redirect("/pay/expired");
  // Unknown and revoked look the same; anything else (PolicyDesk unreachable, or 429 when this IP opened too many
  // links within the hour) is worth another try.
  redirect(result.status === 404 ? "/pay/invalid" : "/pay/invalid?retry=1");
}

/** "/travel" for a travel journey. If PolicyDesk can't say, /car: the journey pages send the visitor on to their own line. */
async function lineOf(publicId: string): Promise<string> {
  try {
    const view = await getOpportunity(publicId);
    return `/${(view && lobForProduct(view.opportunity.product)?.slug) ?? "car"}`;
  } catch {
    return "/car";
  }
}
