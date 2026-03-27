/** Format integer cents as USD for admin labels (catalog storage is cents). */
export function formatUsdFromCents(cents: number, currency: string) {
  const c = (currency || "usd").toLowerCase();
  const amount = Number(cents) / 100;
  if (c === "usd") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
  }
  return `${amount.toFixed(2)} ${c.toUpperCase()}`;
}
