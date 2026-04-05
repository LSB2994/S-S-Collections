import { createHash } from "crypto";

import { supabaseAdminFetch } from "@/lib/supabaseAdmin";
import { sendAdminAlert } from "@/lib/telegram/alert";

type LineItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
};

type Body = {
  items: LineItem[];
  total: number;
  contactPhone: string;
  contactTelegram?: string;
};

function isValidBody(x: unknown): x is Body {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.items) || o.items.length === 0) return false;
  for (const row of o.items) {
    if (!row || typeof row !== "object") return false;
    const r = row as Record<string, unknown>;
    if (typeof r.productId !== "string" || typeof r.productName !== "string") return false;
    if (typeof r.price !== "number" || !Number.isFinite(r.price) || r.price < 0) return false;
    if (typeof r.quantity !== "number" || !Number.isFinite(r.quantity) || r.quantity < 1) return false;
  }
  if (typeof o.total !== "number" || !Number.isFinite(o.total) || o.total < 0) return false;
  if (typeof o.contactPhone !== "string" || !o.contactPhone.trim()) return false;
  if (o.contactTelegram !== undefined && typeof o.contactTelegram !== "string") return false;
  return true;
}

function hashPhoneToSafeInt(phone: string) {
  // Deterministic stable ID for guest users.
  // Keep under JS safe integer range to avoid BigInt / JSON issues with PostgREST.
  const mod = 900_000_000_000_000; // 9e14
  const digest = createHash("sha256").update(phone).digest();
  let acc = 0;
  // Use first 8 bytes only (fast + enough entropy for uniqueness).
  for (let i = 0; i < 8; i++) {
    acc = (acc * 256 + digest[i]!) % mod;
  }
  return acc + 1;
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidBody(json)) {
    return Response.json({ error: "Invalid order payload" }, { status: 400 });
  }

  const { items, total, contactPhone, contactTelegram } = json;
  const trimmedPhone = contactPhone.trim();
  const trimmedTelegram = contactTelegram?.trim() || null;

  const computed = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  if (Math.abs(computed - total) > 0.02) {
    return Response.json({ error: "Total does not match line items" }, { status: 400 });
  }

  // Group by productId (web cart has no size selection, so we choose one variant per product).
  const qtyByProductId = new Map<string, number>();
  for (const i of items) qtyByProductId.set(i.productId, (qtyByProductId.get(i.productId) ?? 0) + i.quantity);
  const productIds = Array.from(qtyByProductId.keys());

  if (!productIds.length) return Response.json({ error: "Missing items" }, { status: 400 });

  type VariantRow = {
    id: string;
    product_id: string;
    price_cents: number;
    currency: string;
    stock: number;
  };

  // Pick the cheapest in-stock active variant per product.
  const variants = await supabaseAdminFetch<VariantRow[]>("/rest/v1/product_variants", {
    query: {
      select: "id,product_id,price_cents,currency,stock",
      product_id: `in.(${productIds.map((id) => encodeURIComponent(id)).join(",")})`,
      active: "eq.true",
      stock: "gt.0",
      order: "price_cents.asc"
    }
  });

  const chosenByProductId = new Map<string, VariantRow>();
  for (const v of variants) {
    if (!chosenByProductId.has(v.product_id)) chosenByProductId.set(v.product_id, v);
  }

  for (const pid of productIds) {
    if (!chosenByProductId.get(pid)) {
      return Response.json({ error: `No in-stock sizes for product ${pid}` }, { status: 400 });
    }
  }

  const currencies = new Set<string>(Array.from(productIds).map((pid) => chosenByProductId.get(pid)!.currency));
  if (currencies.size !== 1) {
    return Response.json({ error: "Mixed currencies in cart are not supported yet" }, { status: 400 });
  }
  const currency = currencies.values().next().value as string;

  const orderItems: Array<{
    variant_id: string;
    product_id: string;
    qty: number;
    unit_price_cents: number;
    line_total_cents: number;
  }> = [];

  for (const pid of productIds) {
    const v = chosenByProductId.get(pid)!;
    const qty = qtyByProductId.get(pid)!;

    if (v.stock < qty) {
      return Response.json({ error: `Not enough stock for product ${pid}` }, { status: 409 });
    }

    const unit = Number(v.price_cents);
    orderItems.push({
      variant_id: v.id,
      product_id: pid,
      qty,
      unit_price_cents: unit,
      line_total_cents: unit * qty
    });
  }

  const subtotalCents = orderItems.reduce((sum, i) => sum + i.line_total_cents, 0);
  const clientCents = Math.round(total * 100);
  // Web product price is derived from min variant price; allow small rounding drift.
  if (Math.abs(subtotalCents - clientCents) > 2) {
    return Response.json({ error: "Pricing changed. Please try again." }, { status: 409 });
  }

  // Create/find a "guest" user record so it shows up on the admin telegram-orders page.
  const telegramUserId = hashPhoneToSafeInt(trimmedPhone);

  type UserRow = { id: string };
  const existingUsers = await supabaseAdminFetch<UserRow[]>("/rest/v1/users", {
    query: { select: "id", telegram_user_id: `eq.${telegramUserId}` }
  });

  const userId = existingUsers?.[0]?.id
    ? existingUsers[0].id
    : (
        await supabaseAdminFetch<UserRow[]>("/rest/v1/users", {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify([
            {
              telegram_user_id: telegramUserId,
              telegram_username: trimmedTelegram,
              first_name: null,
              last_name: null,
              phone: trimmedPhone
            }
          ])
        })
      )?.[0]?.id;

  if (!userId) return Response.json({ error: "Failed to create guest user" }, { status: 500 });

  // Create order.
  const orderRows = await supabaseAdminFetch<Array<{ id: string }>>("/rest/v1/orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([
      {
        user_id: userId,
        status: "pending",
        payment_method: "cod",
        currency,
        subtotal_cents: subtotalCents,
        discount_cents: 0,
        total_cents: subtotalCents,
        discount_code_id: null,
        delivery_name: null,
        delivery_phone: trimmedPhone,
        delivery_address: null,
        stripe_checkout_session_id: null
      }
    ])
  });

  const orderId = orderRows?.[0]?.id;
  if (!orderId) return Response.json({ error: "Order not created" }, { status: 500 });

  // Create order items.
  await supabaseAdminFetch("/rest/v1/order_items", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(
      orderItems.map((i) => ({
        order_id: orderId,
        variant_id: i.variant_id,
        qty: i.qty,
        unit_price_cents: i.unit_price_cents,
        line_total_cents: i.line_total_cents
      }))
    )
  });

  const itemsText = items.map((i) => `• ${i.productName} x${i.quantity} (${i.price})`).join("\n");
  const alertMsg = `🚀 *New Website Order Request!*\n\n*Order ID*: \`${orderId}\`\n*Total*: ${total}\n*Phone*: ${contactPhone}\n*Telegram*: ${contactTelegram || "None"}\n\n*Items*:\n${itemsText}`;
  await sendAdminAlert(alertMsg);

  return Response.json({ id: orderId });
}
