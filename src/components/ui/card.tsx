import type { HTMLAttributes } from "react";

/** The white panel used for every block of content on the journey pages. */
export function Card({
  as: Tag = "section",
  className = "",
  ...rest
}: HTMLAttributes<HTMLElement> & { as?: "section" | "div" }) {
  return <Tag className={`rounded-2xl border border-line bg-card p-5 md:p-6 ${className}`} {...rest} />;
}
