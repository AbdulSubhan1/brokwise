import { ChevronDown } from "lucide-react";
import type { SelectHTMLAttributes } from "react";
import { control } from "./styles";

export type Option = { value: string; label: string };

/** A native select (so keyboards, screen readers and phone pickers work as usual) with Brokwise's look and a chevron. */
export function Select({
  options,
  placeholder,
  className = "",
  ...select
}: { options: readonly Option[]; placeholder?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={`relative ${className}`}>
      <select className={`${control} cursor-pointer appearance-none truncate pr-8`} {...select}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}
