import Stripe from "stripe";
import { NextResponse } from "next/server";

import { getTelegramEnv } from "@/lib/telegram/env";
import { updateOrderStatus } from "@/lib/telegram/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const env = getTelegramEnv();
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Not configured", { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new NextResponse("Missing signature", { status: 400 });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const body = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.order_id;
    if (orderId) await updateOrderStatus(orderId, "paid");
  }

  return NextResponse.json({ received: true });
}

