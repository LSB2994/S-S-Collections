import express from "express";
import Stripe from "stripe";
import { env } from "./env.js";
import { supabase } from "./supabase.js";
import { setOrderStripeSession, updateOrderStatus } from "./db.js";

export function createServer() {
  const app = express();

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.get("/pay/:orderId", async (req, res) => {
    if (!env.STRIPE_SECRET_KEY) return res.status(400).send("Stripe not configured");
    const orderId = req.params.orderId;

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, total_cents, currency, status, stripe_checkout_session_id")
      .eq("id", orderId)
      .single();
    if (error) return res.status(404).send("Order not found");

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    if (order.stripe_checkout_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_checkout_session_id);
      if (session.url) return res.redirect(303, session.url);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: order.currency,
            product_data: { name: `Order ${order.id}` },
            unit_amount: order.total_cents
          },
          quantity: 1
        }
      ],
      metadata: { order_id: order.id },
      success_url: `${env.PUBLIC_BASE_URL}/pay-success?orderId=${order.id}`,
      cancel_url: `${env.PUBLIC_BASE_URL}/pay-cancel?orderId=${order.id}`
    });

    await setOrderStripeSession(order.id, session.id);
    return res.redirect(303, session.url!);
  });

  app.get("/pay-success", async (req, res) => {
    const orderId = String(req.query.orderId ?? "");
    if (orderId) {
      // Stripe webhook is the source of truth, but this helps if webhooks aren't set up yet.
      await updateOrderStatus(orderId, "paid").catch(() => {});
    }
    res.send("Payment successful. You can return to Telegram.");
  });

  app.get("/pay-cancel", (_req, res) => res.send("Payment cancelled. You can return to Telegram."));

  // Stripe webhook (raw body required)
  app.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) return res.status(400).send("Not configured");
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];
    if (!sig || Array.isArray(sig)) return res.status(400).send("Missing signature");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      return res.status(400).send("Invalid signature");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (orderId) await updateOrderStatus(orderId, "paid");
    }

    res.json({ received: true });
  });

  return app;
}

