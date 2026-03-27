export function formatMoney(cents, currency) {
    const value = (cents / 100).toFixed(2);
    return `${currency.toUpperCase()} ${value}`;
}
export function clampInt(n, min, max) {
    return Math.max(min, Math.min(max, Math.trunc(n)));
}
