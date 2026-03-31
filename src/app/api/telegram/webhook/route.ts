import { NextResponse } from "next/server";

import { getTelegramBot } from "@/lib/telegram/bot";
import { getTelegramEnv } from "@/lib/telegram/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") ?? "";
  if (!secret || secret !== getTelegramEnv().TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const update = await req.json();
  const bot = getTelegramBot();
  await bot.handleUpdate(update);
  return NextResponse.json({ ok: true });
}

