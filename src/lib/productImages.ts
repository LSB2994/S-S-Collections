/** Normalize product images from DB (image_urls[] with legacy image_url fallback). */

export function allImageUrls(p: {
  image_url: string | null;
  image_urls?: string[] | null;
}): string[] {
  const raw = p.image_urls;
  const arr = Array.isArray(raw)
    ? raw.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
    : [];
  if (arr.length) return [...new Set(arr.map((u) => u.trim()))];
  const one = p.image_url?.trim();
  return one ? [one] : [];
}

export function primaryImageUrl(p: {
  image_url: string | null;
  image_urls?: string[] | null;
}): string | null {
  return allImageUrls(p)[0] ?? null;
}
