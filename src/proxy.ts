import { type NextRequest, NextResponse } from "next/server";
import { isKnownTopLevel, NOT_FOUND_PAGE } from "@/lib/top-level-routes";

/**
 * A path that isn't ours (/boat/details) gets the 404 page with a real 404 status. Under Cache Components the [lob]
 * page streams before it can call notFound(), so without this the 404 page would answer 200.
 */
export function proxy(request: NextRequest) {
  if (isKnownTopLevel(request.nextUrl.pathname)) return NextResponse.next();
  return NextResponse.rewrite(new URL(NOT_FOUND_PAGE, request.url), { status: 404 });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
