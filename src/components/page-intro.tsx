import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A journey page's top: which line it is (icon and name), the heading and a line or two under it. */
export function PageIntro({
  line,
  title,
  children,
}: {
  line: { title: string; icon: LucideIcon };
  title: string;
  children?: ReactNode;
}) {
  const Icon = line.icon;
  return (
    <div>
      <p className="inline-flex items-center gap-2 rounded-full bg-pine-soft py-1 pr-3 pl-1.5 text-sm font-semibold text-pine-dark">
        <span aria-hidden className="grid size-6 place-items-center rounded-full bg-pine text-white">
          <Icon className="size-3.5" />
        </span>
        {line.title}
      </p>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      {children && <div className="mt-2 text-muted">{children}</div>}
    </div>
  );
}
