const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** Whole US dollars as the website shows them: 1234 → "$1,234". */
export function formatUsd(n: number): string {
  return USD.format(n);
}
