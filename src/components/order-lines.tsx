import { formatUsd } from "@/lib/money";

/**
 * The plan and add-on lines with their total, as PolicyDesk priced them. Payment lines carry no kind, so a line at
 * $0 is an included add-on (PolicyDesk sends those at 0, as PaySandbox gets them).
 */
export function OrderLines({
  lines,
  total,
  totalLabel,
}: {
  lines: { label: string; amount: number }[];
  total: number;
  totalLabel: string;
}) {
  return (
    <dl className="flex flex-col divide-y divide-line">
      {lines.map((line, i) => (
        <div key={`${line.label}-${i}`} className="flex items-baseline justify-between gap-4 py-2.5">
          <dt>{line.label}</dt>
          <dd className="shrink-0 font-semibold">
            {line.amount === 0 ? <span className="text-pine-dark">Included</span> : formatUsd(line.amount)}
          </dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 pt-3">
        <dt className="font-bold">{totalLabel}</dt>
        <dd className="text-2xl font-extrabold" data-testid="order-total">
          {formatUsd(total)}
        </dd>
      </div>
    </dl>
  );
}
