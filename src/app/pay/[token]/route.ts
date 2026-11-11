import { redirect } from "next/navigation";
import { setJourney } from "@/lib/journey";
import { isPayToken } from "@/lib/pay-link";
import { openPayLink } from "@/lib/policydesk";

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
    redirect(result.status === "paid" ? "/car/thank-you" : "/car/payment");
  }
  if (result.status === 410) redirect("/pay/expired");
  // Unknown and revoked look the same; anything else is PolicyDesk being unreachable, worth another try.
  redirect(result.status === 404 ? "/pay/invalid" : "/pay/invalid?retry=1");
}
