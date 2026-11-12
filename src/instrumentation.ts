import type { Instrumentation } from "next";

// Every server error (pages, route handlers, server actions) goes to Pulse, with no code in each route.
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { sendToPulse } = await import("@/lib/pulse");
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : undefined;
  await sendToPulse({
    level: "error",
    message,
    path: request.path,
    context: { method: request.method, route: context.routePath, type: context.routeType, digest },
  });
};
