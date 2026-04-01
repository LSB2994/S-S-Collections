import "server-only";

import { Markup, Telegraf } from "telegraf";

import { getTelegramEnv } from "./env";
import {
  addToCart,
  clearCart,
  createOrder,
  createOrderItems,
  getCart,
  getCategoryHeading,
  getProduct,
  getVariantSummary,
  listActiveCategoriesByMain,
  listActiveMainCategories,
  listActiveProducts,
  listActiveProductsByCategory,
  listActiveProductsByMainCategory,
  listActiveVariants,
  listAllUserTelegramIds,
  listOrdersForUser,
  minPriceByProductIds,
  productImageUrls,
  updateCartQty,
  updateOrderStatus,
  upsertUserFromTelegram
} from "./db";
import { formatMoney } from "./money";

type BotContext = Parameters<Telegraf["on"]>[1] extends (ctx: infer C) => any ? C : any;

const CB = {
  categories: "categories",
  catalogPage: (offset: number) => `cat:${offset}`,
  /** Pick a main category (Man / Woman / Kid) → sub-categories */
  mainPick: (mainCategoryId: string) => `mainm:${mainCategoryId}`,
  /** All products under any sub-category of this main */
  mainAll: (mainCategoryId: string, offset: number) => `maina:${mainCategoryId}:${offset}`,
  categoryPage: (categoryId: string, offset: number) => `catc:${categoryId}:${offset}`,
  product: (productId: string) => `p:${productId}`,
  variantAdd: (variantId: string) => `add:${variantId}`,
  variantOos: (variantId: string) => `oos:${variantId}`,
  cart: "cart",
  cartQty: (cartItemId: string, qty: number) => `qty:${cartItemId}:${qty}`,
  checkout: "checkout",
  checkoutCOD: "pay:cod",
  checkoutStripe: "pay:stripe"
} as const;

const PAGE_SIZE = 6;

const mainNavKeyboard = Markup.keyboard([["🛍 Shop", "🧺 Cart"], ["📦 My orders"]]).resize();

type ListedProduct = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
};

function truncBtn(text: string, max: number) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "…";
}

function mdEscape(text: string) {
  // Basic MarkdownV2-ish escaping for common characters.
  // We primarily use Markdown (not V2), but this helps avoid accidental formatting.
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

async function sendProductBrowse(
  ctx: BotContext,
  products: ListedProduct[],
  opts: {
    heading: string;
    pageLabel: string;
    prevCb?: string;
    nextCb?: string;
    showPrev: boolean;
    showNext: boolean;
    bottomRows: ReturnType<typeof Markup.button.callback>[][];
  }
) {
  const prices = await minPriceByProductIds(products.map((p) => p.id));
  const lines = products.map((p) => {
    const pr = prices.get(p.id);
    const priceStr = pr ? formatMoney(pr.price_cents, pr.currency) : "—";
    return `• ${p.title}  ·  from ${priceStr}`;
  });
  const text = [
    `🛍 *${mdEscape(opts.heading)}*`,
    `_${mdEscape(opts.pageLabel)}_`,
    "",
    ...lines.map(mdEscape),
    "",
    "_Tap an item to view photos & sizes._"
  ].join("\n");

  const rows: ReturnType<typeof Markup.button.callback>[][] = products.map((p) => [
    Markup.button.callback(truncBtn(`View · ${p.title}`, 58), CB.product(p.id))
  ]);
  const navRow: ReturnType<typeof Markup.button.callback>[] = [];
  if (opts.showPrev && opts.prevCb) navRow.push(Markup.button.callback("◀ Prev", opts.prevCb));
  if (opts.showNext && opts.nextCb) navRow.push(Markup.button.callback("Next ▶", opts.nextCb));
  if (navRow.length) rows.push(navRow);
  rows.push(...opts.bottomRows);

  await ctx.reply(text, { parse_mode: "Markdown", ...Markup.inlineKeyboard(rows) });
}

async function sendOrdersList(ctx: BotContext) {
  const user = await upsertUserFromTelegram(ctx.from!);
  const orders = await listOrdersForUser(user.id, 10);
  if (!orders.length) {
    await ctx.reply("📦 You have no orders yet.", Markup.inlineKeyboard([[Markup.button.callback("🛍 Shop", CB.categories)]]));
    return;
  }
  const lines = orders.map((o) => {
    const short = o.id.slice(0, 8);
    const status = o.status.replaceAll("_", " ");
    return `• *${short}…*  ·  ${mdEscape(status)}  ·  ${mdEscape(o.payment_method)}  ·  *${mdEscape(
      formatMoney(o.total_cents, o.currency)
    )}*`;
  });
  await ctx.reply(["📦 *Your orders*", "", ...lines].join("\n"), {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([[Markup.button.callback("🛍 Shop", CB.categories)]])
  });
}

function isAdmin(ctx: BotContext) {
  const id = ctx.from?.id;
  return id != null && getTelegramEnv().ADMIN_IDS.includes(id);
}

async function sendCatalog(ctx: BotContext, offset: number, categoryId?: string) {
  const products = categoryId
    ? await listActiveProductsByCategory(categoryId, PAGE_SIZE, offset)
    : await listActiveProducts(PAGE_SIZE, offset);
  if (!products.length) {
    await ctx.reply(
      categoryId ? "No products in this category yet." : "No products found.",
      Markup.inlineKeyboard([[Markup.button.callback("🧭 Sections", CB.categories)], [Markup.button.callback("🧺 Cart", CB.cart)]])
    );
    return;
  }

  const heading = categoryId ? await getCategoryHeading(categoryId) : "All products";
  const prevCb = categoryId
    ? CB.categoryPage(categoryId, Math.max(0, offset - PAGE_SIZE))
    : CB.catalogPage(Math.max(0, offset - PAGE_SIZE));
  const nextCb = categoryId ? CB.categoryPage(categoryId, offset + products.length) : CB.catalogPage(offset + products.length);

  await sendProductBrowse(ctx, products as ListedProduct[], {
    heading,
    pageLabel: `Items ${offset + 1}–${offset + products.length}`,
    prevCb,
    nextCb,
    showPrev: offset > 0,
    showNext: products.length === PAGE_SIZE,
    bottomRows: [[Markup.button.callback("🧭 Sections", CB.categories)], [Markup.button.callback("🧺 Cart", CB.cart)]]
  });
}

async function sendCategories(ctx: BotContext) {
  const mains = await listActiveMainCategories();
  if (!mains.length) {
    await sendCatalog(ctx, 0);
    return;
  }

  const buttons: ReturnType<typeof Markup.button.callback | typeof Markup.button.url>[][] = mains.map((m) => [
    Markup.button.callback(`🧭 ${m.name}`, CB.mainPick(m.id))
  ]);
  buttons.push([Markup.button.callback("✨ All products", CB.catalogPage(0))]);
  buttons.push([Markup.button.url("🌐 Visit Website", "https://s-s-collections.vercel.app/")]);
  await ctx.reply("Pick a section:", Markup.inlineKeyboard(buttons));
}

async function sendSubCategories(ctx: BotContext, mainCategoryId: string) {
  const subs = await listActiveCategoriesByMain(mainCategoryId);
  const mains = await listActiveMainCategories();
  const mainName = mains.find((m) => m.id === mainCategoryId)?.name ?? "This section";

  if (!subs.length) {
    await ctx.reply(
      `No sub-categories in ${mainName} yet. Browse all products in this section, or ask an admin to add categories.`,
      Markup.inlineKeyboard([
        [Markup.button.callback(`✨ All ${mainName} products`, CB.mainAll(mainCategoryId, 0))],
        [Markup.button.callback("⬅ Sections", CB.categories)]
      ])
    );
    return;
  }

  const rows = subs.map((c) => [Markup.button.callback(c.name, CB.categoryPage(c.id, 0))]);
  rows.push([Markup.button.callback(`✨ All ${mainName} products`, CB.mainAll(mainCategoryId, 0))]);
  rows.push([Markup.button.callback("⬅ Sections", CB.categories)]);

  await ctx.reply(`Choose a category in ${mainName}:`, Markup.inlineKeyboard(rows));
}

async function sendCatalogByMain(ctx: BotContext, mainCategoryId: string, offset: number) {
  const products = await listActiveProductsByMainCategory(mainCategoryId, 6, offset);
  if (!products.length) {
    await ctx.reply(
      "No products in this section yet.",
      Markup.inlineKeyboard([[Markup.button.callback("⬅ Categories", CB.mainPick(mainCategoryId))], [Markup.button.callback("🧭 Sections", CB.categories)]])
    );
    return;
  }

  for (const p of products) {
    const desc = [p.title, p.description].filter(Boolean).join("\n");
    const kb = Markup.inlineKeyboard([[Markup.button.callback("👀 View sizes", CB.product(p.id)), Markup.button.callback("🧺 Cart", CB.cart)]]);

    const first = productImageUrls(p)[0];
    if (first) await ctx.replyWithPhoto({ url: first }, { caption: desc, ...kb });
    else await ctx.reply(desc, kb);
  }

  const nextOffset = offset + products.length;
  const hasMore = products.length === PAGE_SIZE;
  const navRow: ReturnType<typeof Markup.button.callback>[] = [];
  if (offset > 0) navRow.push(Markup.button.callback("◀ Prev", CB.mainAll(mainCategoryId, Math.max(0, offset - PAGE_SIZE))));
  if (hasMore) navRow.push(Markup.button.callback("Next ▶", CB.mainAll(mainCategoryId, nextOffset)));
  const rows: ReturnType<typeof Markup.button.callback>[][] = [];
  if (navRow.length) rows.push(navRow);
  rows.push([Markup.button.callback("⬅ Categories", CB.mainPick(mainCategoryId))]);
  rows.push([Markup.button.callback("🧭 Sections", CB.categories)]);
  await ctx.reply("Browse more:", Markup.inlineKeyboard(rows));
}

async function sendProduct(ctx: BotContext, productId: string) {
  const p = await getProduct(productId);
  const variants = await listActiveVariants(productId);
  if (!variants.length) {
    await ctx.reply("No sizes available for this product.", Markup.inlineKeyboard([[Markup.button.callback("🧭 Sections", CB.categories)]]));
    return;
  }

  const buttons = variants.map((v) => {
    if (v.stock === 0) {
      return [Markup.button.callback(`${v.size} · Sold out`, CB.variantOos(v.id))];
    }
    const stockNote = v.stock <= 5 ? ` (${v.stock} left)` : "";
    return [Markup.button.callback(`${v.size} · ${formatMoney(v.price_cents, v.currency)}${stockNote}`, CB.variantAdd(v.id))];
  });

  const kb = Markup.inlineKeyboard([
    ...buttons,
    [Markup.button.callback("🧺 View cart", CB.cart)],
    [Markup.button.callback("🧭 Sections", CB.categories)]
  ]);

  const text = [`*${mdEscape(p.title)}*`, p.description ? mdEscape(p.description) : ""].filter(Boolean).join("\n");
  const urls = productImageUrls(p);

  if (urls.length === 0) {
    await ctx.reply(text, { parse_mode: "Markdown", ...kb });
  } else if (urls.length === 1) {
    await ctx.replyWithPhoto({ url: urls[0] }, { caption: text, parse_mode: "Markdown", ...kb });
  } else {
    const slice = urls.slice(0, 10);
    const media = slice.map((url, i) => ({
      type: "photo" as const,
      media: url,
      caption: i === 0 ? text : undefined,
      parse_mode: i === 0 ? ("Markdown" as const) : undefined
    }));
    await ctx.replyWithMediaGroup(media);
    await ctx.reply("Pick a size to add to cart:", kb);
  }
}

async function sendCart(ctx: BotContext) {
  const user = await upsertUserFromTelegram(ctx.from!);
  const cart = await getCart(user.id);
  if (!cart.length) {
    await ctx.reply(
      "Your cart is empty.",
      Markup.inlineKeyboard([[Markup.button.callback("Open Shop", CB.categories)], [Markup.button.callback("All products", CB.catalogPage(0))]])
    );
    return;
  }

  let subtotal = 0;
  const lines: string[] = [];

  const qtyButtons: Array<ReturnType<typeof Markup.button.callback>[]> = [];
  for (const item of cart as any[]) {
    const v = item.product_variants;
    const title = v?.products?.title ?? "Item";
    const unit = v?.price_cents ?? 0;
    const currency = v?.currency ?? "usd";
    subtotal += unit * item.qty;
    lines.push(`${title} (Size ${v.size}) x${item.qty} — ${formatMoney(unit * item.qty, currency)}`);

    qtyButtons.push([
      Markup.button.callback("−", CB.cartQty(item.id, Math.max(0, item.qty - 1))),
      Markup.button.callback("Remove", CB.cartQty(item.id, 0)),
      Markup.button.callback("+", CB.cartQty(item.id, item.qty + 1))
    ]);
  }

  const currency = (cart as any[])[0]?.product_variants?.currency ?? "usd";
  const text = [`🧺 *Your cart*`, "", ...lines.map(mdEscape), "", `*Subtotal: ${mdEscape(formatMoney(subtotal, currency))}*`].join("\n");

  const kb = Markup.inlineKeyboard([
    ...qtyButtons,
    [Markup.button.callback("✅ Checkout", CB.checkout)],
    [Markup.button.callback("🛍 Keep shopping", CB.categories)]
  ]);

  await ctx.reply(text, { parse_mode: "Markdown", ...kb });
}

async function sendCheckoutMenu(ctx: BotContext) {
  const rows: ReturnType<typeof Markup.button.callback>[][] = [[Markup.button.callback("Cash on Delivery", CB.checkoutCOD)]];
  if (getTelegramEnv().STRIPE_SECRET_KEY) {
    rows.push([Markup.button.callback("Online payment (Stripe)", CB.checkoutStripe)]);
  }
  rows.push([Markup.button.callback("Back to cart", CB.cart)]);
  await ctx.reply("Choose payment method:", Markup.inlineKeyboard(rows));
}

async function createOrderFromCart(ctx: BotContext, method: "cod" | "stripe") {
  const user = await upsertUserFromTelegram(ctx.from!);
  const cart = await getCart(user.id);
  if (!cart.length) {
    await ctx.reply("Cart is empty.");
    return;
  }

  const currency = (cart as any[])[0]?.product_variants?.currency ?? "usd";
  const items = (cart as any[]).map((i) => ({
    variantId: i.variant_id as string,
    qty: i.qty as number,
    unit: i.product_variants?.price_cents ?? 0
  }));
  const subtotal = items.reduce((sum, i) => sum + i.unit * i.qty, 0);
  const discount = 0;
  const total = subtotal - discount;

  const status = method === "stripe" ? "awaiting_payment" : "pending";
  const orderId = await createOrder({
    userId: user.id,
    payment_method: method,
    currency,
    subtotal_cents: subtotal,
    discount_cents: discount,
    total_cents: total,
    status
  });
  await createOrderItems(
    orderId,
    items.map((i) => ({ variantId: i.variantId, qty: i.qty }))
  );
  await clearCart(user.id);

  // Build order summary from the cart snapshot captured before clearing
  const summaryLines = (cart as any[]).map((item) => {
    const v = item.product_variants;
    const title = v?.products?.title ?? "Item";
    const unit = v?.price_cents ?? 0;
    return `• ${mdEscape(title)} (${mdEscape(v?.size ?? "")}) x${item.qty} — ${mdEscape(formatMoney(unit * item.qty, v?.currency ?? currency))}`;
  });
  const shortId = orderId.slice(0, 8);

  if (method === "cod") {
    const msg = [
      `✅ *Order placed\\!*`,
      `Order *#${shortId}…*`,
      "",
      ...summaryLines,
      "",
      `*Total: ${mdEscape(formatMoney(total, currency))}*`,
      `Payment: Cash on Delivery`,
      `Status: Pending`
    ].join("\n");
    await ctx.reply(msg, { parse_mode: "Markdown", ...Markup.inlineKeyboard([[Markup.button.callback("📦 My orders", "orders")]]) });
    return;
  }

  const msg = [
    `✅ *Order placed\\!*`,
    `Order *#${shortId}…*`,
    "",
    ...summaryLines,
    "",
    `*Total: ${mdEscape(formatMoney(total, currency))}*`,
    `Status: Awaiting payment`
  ].join("\n");
  await ctx.reply(msg, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([[Markup.button.url("💳 Pay with Stripe", `${getTelegramEnv().PUBLIC_BASE_URL}/pay/${orderId}`)]])
  });
}

async function dispatchCallback(ctx: BotContext, data: string) {
  if (data === CB.cart) {
    await ctx.answerCbQuery();
    return sendCart(ctx);
  }
  if (data === CB.checkout) {
    await ctx.answerCbQuery();
    return sendCheckoutMenu(ctx);
  }
  if (data === CB.checkoutCOD || data === CB.checkoutStripe) {
    await ctx.answerCbQuery();
    if (data === CB.checkoutStripe && !getTelegramEnv().STRIPE_SECRET_KEY) {
      await ctx.reply("Online payment is not configured. Use Cash on Delivery or contact the shop.");
      return;
    }
    return createOrderFromCart(ctx, data === CB.checkoutCOD ? "cod" : "stripe");
  }
  if (data === CB.categories) {
    await ctx.answerCbQuery();
    return sendCategories(ctx);
  }
  if (data === "orders") {
    await ctx.answerCbQuery();
    return sendOrdersList(ctx);
  }
  if (data.startsWith("oos:")) {
    return ctx.answerCbQuery("Sorry, this size is sold out.", { show_alert: true });
  }
  if (data.startsWith("cat:")) {
    await ctx.answerCbQuery();
    return sendCatalog(ctx, Number(data.split(":")[1] ?? 0) || 0);
  }
  if (data.startsWith("catc:")) {
    await ctx.answerCbQuery();
    const [, categoryId, offsetStr] = data.split(":");
    if (!categoryId) return;
    return sendCatalog(ctx, Number(offsetStr ?? 0) || 0, categoryId);
  }
  if (data.startsWith("mainm:")) {
    await ctx.answerCbQuery();
    const mainId = data.slice("mainm:".length);
    if (!mainId) return;
    return sendSubCategories(ctx, mainId);
  }
  if (data.startsWith("maina:")) {
    await ctx.answerCbQuery();
    const [, mainId, offsetStr] = data.split(":");
    if (!mainId) return;
    return sendCatalogByMain(ctx, mainId, Number(offsetStr ?? 0) || 0);
  }
  if (data.startsWith("p:")) {
    await ctx.answerCbQuery();
    return sendProduct(ctx, data.slice(2));
  }
  if (data.startsWith("add:")) {
    await ctx.answerCbQuery("Added ✓");
    const variantId = data.slice(4);
    const user = await upsertUserFromTelegram(ctx.from);
    await addToCart(user.id, variantId, 1);
    let line = "Added to your cart.";
    try {
      const v = await getVariantSummary(variantId);
      line = `✅ Added: *${mdEscape(v.title)}* — size ${mdEscape(v.size)} — ${mdEscape(formatMoney(v.price_cents, v.currency))}`;
    } catch {
      /* ignore */
    }
    return ctx.reply(line, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([[Markup.button.callback("🧺 View cart", CB.cart)], [Markup.button.callback("🛍 Keep shopping", CB.categories)]])
    });
  }
  if (data.startsWith("qty:")) {
    await ctx.answerCbQuery();
    const [, cartItemId, qtyStr] = data.split(":");
    const qty = Number(qtyStr);
    if (!cartItemId || !Number.isFinite(qty)) return;
    await updateCartQty(cartItemId, qty);
    return sendCart(ctx);
  }
}

export function getTelegramBot() {
  const g = globalThis as unknown as { __telegramBot?: Telegraf<any> };
  if (g.__telegramBot) return g.__telegramBot;

  const bot = new Telegraf(getTelegramEnv().TELEGRAM_BOT_TOKEN);

  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();
    try {
      await upsertUserFromTelegram(ctx.from);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("upsertUserFromTelegram failed:", err);
      const msg =
        "Sorry, the shop database is not available. Ask the admin to run supabase/schema.sql in the Supabase SQL editor and check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.";
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => {});
      } else {
        await ctx.reply(msg).catch(() => {});
      }
      return;
    }
    return next();
  });

  bot.start(async (ctx) => {
    const name = ctx.from?.first_name ? ` ${ctx.from.first_name}` : "";
    await ctx.reply(
      [
        `Welcome${name}! 👋`,
        "",
        "Use the menu buttons below:",
        "• 🛍 Shop — browse items",
        "• 🧺 Cart — checkout",
        "• 📦 My orders — track status"
      ].join("\n"),
      mainNavKeyboard
    );
    await ctx.reply(
      "Quick actions:",
      Markup.inlineKeyboard([
        [Markup.button.callback("🛍 Browse", CB.categories), Markup.button.callback("🧺 Cart", CB.cart)],
        [Markup.button.url("🌐 Visit Website", "https://s-s-collections.vercel.app/")]
      ])
    );
  });

  bot.hears(/^🛍 Shop$|^Shop$/, async (ctx) => {
    await sendCategories(ctx);
  });
  bot.hears(/^🧺 Cart$|^Cart$/, async (ctx) => {
    await sendCart(ctx);
  });
  bot.hears(/^📦 My orders$|^My orders$/, async (ctx) => {
    await sendOrdersList(ctx);
  });

  bot.command("catalog", async (ctx) => {
    await sendCategories(ctx);
  });
  bot.command("shop", async (ctx) => {
    await sendCategories(ctx);
  });

  bot.command("cart", async (ctx) => {
    await sendCart(ctx);
  });

  bot.command("orders", async (ctx) => {
    await sendOrdersList(ctx);
  });

  bot.command("broadcast", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("Not allowed.");
    const text = ctx.message?.text?.replace(/^\/broadcast\s*/i, "")?.trim() ?? "";
    if (!text) return ctx.reply("Usage: /broadcast <message>");
    const ids = await listAllUserTelegramIds();
    let ok = 0;
    for (const id of ids) {
      try {
        await ctx.telegram.sendMessage(id, text);
        ok += 1;
      } catch {
        // ignore blocked users
      }
    }
    await ctx.reply(`Broadcast sent to ${ok}/${ids.length}.`);
  });

  bot.command("admin_products", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("Not allowed.");
    const products = await listActiveProducts(30, 0);
    if (!products.length) return ctx.reply("No active products.");
    await ctx.reply(products.map((p) => `${p.id} — ${p.title}`).join("\n"));
  });

  bot.command("admin_order", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("Not allowed.");
    const parts = (ctx.message?.text ?? "").split(/\s+/).slice(1);
    const [orderId, status] = parts;
    if (!orderId || !status) return ctx.reply("Usage: /admin_order <orderId> <status>\nValid statuses: pending, awaiting_payment, paid, shipped, delivered, cancelled");
    await updateOrderStatus(orderId, status);
    await ctx.reply(`✅ Order ${orderId.slice(0, 8)}… updated to: ${status}`);
  });

  bot.command("admin_help", async (ctx) => {
    if (!isAdmin(ctx)) return ctx.reply("Not allowed.");
    await ctx.reply(
      [
        "🔧 *Admin commands*",
        "",
        "/admin_help — show this message",
        "/admin_products — list active products",
        "/admin_order <orderId> <status> — update order status",
        "  Statuses: pending · awaiting_payment · paid · shipped · delivered · cancelled",
        "/broadcast <message> — send message to all users"
      ].join("\n"),
      { parse_mode: "Markdown" }
    );
  });

  bot.on("callback_query", async (ctx) => {
    const data = (ctx.callbackQuery as any)?.data as string | undefined;
    if (!data) return;
    try {
      await dispatchCallback(ctx, data);
    } catch (e: any) {
      console.error("callback_query error:", data, e);
      await ctx.reply("Something went wrong. Please try again or contact the shop.");
    }
  });

  g.__telegramBot = bot;
  return bot;
}

