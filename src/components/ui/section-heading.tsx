import type { LucideIcon } from "lucide-react";

/**
 * A heading with an icon tile. Inside a fieldset it is the legend's content: the legend floats, so it sits inside the
 * card instead of on its border.
 */
export function SectionHeading({
  icon: Icon,
  title,
  description,
  id,
  as: Tag = "h2",
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  id?: string;
  as?: "h2" | "h3";
}) {
  return (
    <>
      <Tag id={id} className="flex items-center gap-3 text-lg font-bold">
        {Icon && (
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-pine-soft text-pine">
            <Icon className="size-5" />
          </span>
        )}
        {title}
      </Tag>
      {description && <span className="mt-1 block text-sm text-muted">{description}</span>}
    </>
  );
}
