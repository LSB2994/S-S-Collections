import { updateOrderStatus } from "@/lib/telegram/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = String(url.searchParams.get("orderId") ?? "");
  if (orderId) {
    // Stripe webhook is the source of truth, but this helps if webhooks aren't set up yet.
    await updateOrderStatus(orderId, "paid").catch(() => {});
  }
  return new Response("Payment successful. You can return to Telegram.", {
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

