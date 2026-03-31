import { NextResponse } from "next/server";

import { getTelegramEnv } from "@/lib/telegram/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const env = getTelegramEnv();
  const setupSecret = env.TELEGRAM_WEBHOOK_SETUP_SECRET;
  if (!setupSecret) return new NextResponse("Not configured", { status: 400 });

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${setupSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const webhookUrl = `${env.PUBLIC_BASE_URL}/api/telegram/webhook?secret=${encodeURIComponent(
    env.TELEGRAM_WEBHOOK_SECRET
  )}`;

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: webhookUrl })
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json({ ok: false, webhookUrl, telegram: data }, { status: 500 });
  }
  return NextResponse.json({ ok: true, webhookUrl, telegram: data });
}

