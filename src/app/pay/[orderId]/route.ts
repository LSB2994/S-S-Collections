import Stripe from "stripe";
import { redirect } from "next/navigation";

import { getTelegramEnv } from "@/lib/telegram/env";
import { getTelegramSupabase } from "@/lib/telegram/supabase";
import { setOrderStripeSession, updateOrderStatus } from "@/lib/telegram/db";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  const env = getTelegramEnv();
  if (!env.STRIPE_SECRET_KEY) {
    return new Response("Stripe not configured", { status: 400 });
  }

  const { orderId } = await ctx.params;
  const { data: order, error } = await getTelegramSupabase()
    .from("orders")
    .select("id, total_cents, currency, status, stripe_checkout_session_id")
    .eq("id", orderId)
    .single();
  if (error) return new Response("Order not found", { status: 404 });
  const o = order as unknown as {
    id: string;
    total_cents: number;
    currency: string;
    status: string;
    stripe_checkout_session_id: string | null;
  };

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  if (o.stripe_checkout_session_id) {
    const session = await stripe.checkout.sessions.retrieve(o.stripe_checkout_session_id);
    if (session.url) redirect(session.url);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: o.currency,
          product_data: { name: `Order ${o.id}` },
          unit_amount: o.total_cents
        },
        quantity: 1
      }
    ],
    metadata: { order_id: o.id },
    success_url: `${env.PUBLIC_BASE_URL}/pay-success?orderId=${o.id}`,
    cancel_url: `${env.PUBLIC_BASE_URL}/pay-cancel?orderId=${o.id}`
  });

  await setOrderStripeSession(o.id, session.id);
  await updateOrderStatus(o.id, "awaiting_payment").catch(() => {});
  redirect(session.url!);
}

