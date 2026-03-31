import "server-only";

import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  },
  z.string().min(1).optional()
);

const schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  STRIPE_SECRET_KEY: optionalNonEmptyString,
  STRIPE_WEBHOOK_SECRET: optionalNonEmptyString,

  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),

  ADMIN_TELEGRAM_IDS: z.string().default(""),
  TELEGRAM_WEBHOOK_SETUP_SECRET: optionalNonEmptyString
});

export type TelegramEnv = z.infer<typeof schema> & { ADMIN_IDS: number[] };

let cached: TelegramEnv | null = null;

export function getTelegramEnv(): TelegramEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables (telegram)");
  }

  cached = {
    ...parsed.data,
    ADMIN_IDS: parsed.data.ADMIN_TELEGRAM_IDS.split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n))
  };
  return cached;
}

