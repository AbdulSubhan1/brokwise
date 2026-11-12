"use client";

import { useState } from "react";
import { daysInMonth, isoFromParts, MONTHS, partsFromIso, yearOptions } from "./date-parts";
import { FieldError } from "./field-error";
import { Select } from "./select";

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));

/**
 * A date as three selects (Day, Month, Year) in one labelled group. The form sends one ISO value in a hidden field
 * named `name`; the selects also carry `<name>-day` etc. so the server can build it when JavaScript is off.
 * `order` puts the newest years first (dates of birth) or the nearest first (trip dates). Each select's own label is
 * for screen readers only: its placeholder shows the same word, and the selects line up with a text field beside them.
 */
export function DateField({
  name,
  label,
  minYear,
  maxYear,
  order = "desc",
  defaultValue,
  error,
  hint,
}: {
  name: string;
  label: string;
  minYear: number;
  maxYear: number;
  order?: "asc" | "desc";
  defaultValue?: string;
  error?: string;
  hint?: string;
}) {
  const [parts, setParts] = useState(() => partsFromIso(defaultValue));
  const iso = isoFromParts(parts.day, parts.month, parts.year);
  const complete = parts.day !== "" && parts.month !== "" && parts.year !== "";
  const impossible = complete && iso === "";
  const years = yearOptions(minYear, maxYear, order).map((y) => ({ value: String(y), label: String(y) }));
  const message =
    error ??
    (impossible
      ? `${MONTHS[Number(parts.month) - 1]} ${parts.year} has ${daysInMonth(Number(parts.year), Number(parts.month))} days.`
      : undefined);
  const describedBy = [hint ? `${name}-hint` : null, message ? `${name}-error` : null].filter(Boolean).join(" ") || undefined;

  // An impossible date still goes to the server as written, so its answer names the problem.
  const value =
    iso ||
    (complete ? `${parts.year}-${parts.month.padStart(2, "0")}-${parts.day.padStart(2, "0")}` : "");

  const part = (key: "day" | "month" | "year", text: string, options: { value: string; label: string }[], width: string) => (
    <div className={width}>
      <label htmlFor={`${name}-${key}`} className="sr-only">
        {text}
      </label>
      <Select
        id={`${name}-${key}`}
        name={`${name}-${key}`}
        placeholder={text}
        options={options}
        value={parts[key]}
        onChange={(e) => setParts((p) => ({ ...p, [key]: e.target.value }))}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy}
      />
    </div>
  );

  return (
    <fieldset>
      <legend className="font-medium">{label}</legend>
      {hint && (
        <p id={`${name}-hint`} className="mt-0.5 text-sm text-muted">
          {hint}
        </p>
      )}
      <div className="mt-1 flex gap-2">
        {part("day", "Day", DAYS, "w-[27%]")}
        {part("month", "Month", MONTH_OPTIONS, "flex-1")}
        {part("year", "Year", years, "w-[30%]")}
      </div>
      <input type="hidden" name={name} value={value} />
      <FieldError id={`${name}-error`} message={message} />
    </fieldset>
  );
}
