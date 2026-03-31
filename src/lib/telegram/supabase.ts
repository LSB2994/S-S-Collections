import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getTelegramEnv } from "./env";

let cached: ReturnType<typeof createClient> | null = null;

export function getTelegramSupabase() {
  if (cached) return cached;
  const env = getTelegramEnv();
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "nextjs-telegram-bot" } }
  });
  return cached;
}

