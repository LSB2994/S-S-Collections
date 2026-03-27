export function formatMoney(cents: number, currency: string) {
  const value = (cents / 100).toFixed(2);
  return `${currency.toUpperCase()} ${value}`;
}

export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

