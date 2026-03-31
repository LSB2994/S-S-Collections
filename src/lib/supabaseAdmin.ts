type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

function getSupabaseAdminConfig(): SupabaseAdminConfig {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("Missing SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return { url, serviceRoleKey };
}

export async function supabaseAdminFetch<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string> }
): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const fullUrl = new URL(path.startsWith("/") ? `${url}${path}` : `${url}/${path}`);
  if (init?.query) {
    for (const [k, v] of Object.entries(init.query)) fullUrl.searchParams.set(k, v);
  }

  const res = await fetch(fullUrl, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": init?.body ? "application/json" : "application/json",
      ...init?.headers
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase request failed (${res.status}): ${text || res.statusText}`);
  }

  // PostgREST returns empty body on some deletes/updates; handle gracefully
  const text = await res.text();
  return (text ? (JSON.parse(text) as T) : (undefined as T));
}

function parsePostgrestCount(contentRange: string | null): number | null {
  // Example: "0-0/123" or "*/123"
  if (!contentRange) return null;
  const m = contentRange.match(/\/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

/** Efficient table count using PostgREST Content-Range (Prefer: count=exact). */
export async function supabaseAdminCount(path: string, query?: Record<string, string>): Promise<number> {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const fullUrl = new URL(path.startsWith("/") ? `${url}${path}` : `${url}/${path}`);
  const q = query ?? {};
  // Request minimal rows; we only need Content-Range.
  if (!("select" in q)) fullUrl.searchParams.set("select", "id");
  if (!("limit" in q)) fullUrl.searchParams.set("limit", "1");
  for (const [k, v] of Object.entries(q)) fullUrl.searchParams.set(k, v);

  const res = await fetch(fullUrl, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "count=exact"
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase request failed (${res.status}): ${text || res.statusText}`);
  }

  const count = parsePostgrestCount(res.headers.get("content-range"));
  if (count == null || !Number.isFinite(count)) {
    // Fallback: parse body length (may undercount if limit applied).
    const text = await res.text().catch(() => "");
    try {
      const rows = JSON.parse(text) as unknown[];
      return Array.isArray(rows) ? rows.length : 0;
    } catch {
      return 0;
    }
  }
  // Consume body to avoid leaking streams in some runtimes.
  await res.arrayBuffer().catch(() => {});
  return count;
}

