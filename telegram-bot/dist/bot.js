import { Telegraf, Markup } from "telegraf";
import { env } from "./env.js";
import { addToCart, clearCart, createOrder, createOrderItems, getCart, getCategoryHeading, getProduct, getVariantSummary, listActiveCategoriesByMain, listActiveMainCategories, listActiveProducts, listActiveProductsByCategory, listActiveProductsByMainCategory, listActiveVariants, listAllUserTelegramIds, listOrdersForUser, minPriceByProductIds, updateCartQty, updateOrderStatus, upsertUserFromTelegram } from "./db.js";
import { formatMoney } from "./money.js";
const CB = {
    categories: "categories",
    catalogPage: (offset) => `cat:${offset}`,
    /** Pick a main category (Man / Woman / Kid) → sub-categories */
    mainPick: (mainCategoryId) => `mainm:${mainCategoryId}`,
    /** All products under any sub-category of this main */
    mainAll: (mainCategoryId, offset) => `maina:${mainCategoryId}:${offset}`,
    categoryPage: (categoryId, offset) => `catc:${categoryId}:${offset}`,
    product: (productId) => `p:${productId}`,
    variantAdd: (variantId) => `add:${variantId}`,
    cart: "cart",
    cartQty: (cartItemId, qty) => `qty:${cartItemId}:${qty}`,
    checkout: "checkout",
    checkoutCOD: "pay:cod",
    checkoutStripe: "pay:stripe"
};
const PAGE_SIZE = 6;
const mainNavKeyboard = Markup.keyboard([["Shop", "Cart"], ["My orders"]]).resize();
function truncBtn(text, max) {
    if (text.length <= max)
        return text;
    return text.slice(0, max - 1) + "…";
}
async function sendProductBrowse(ctx, products, opts) {
    const prices = await minPriceByProductIds(products.map((p) => p.id));
    const lines = products.map((p, i) => {
        const pr = prices.get(p.id);
        const priceStr = pr ? formatMoney(pr.price_cents, pr.currency) : "—";
        return `${i + 1}. ${p.title} — from ${priceStr}`;
    });
    const text = [
        `🛍 ${opts.heading}`,
        "",
        opts.pageLabel,
        "",
        ...lines,
        "",
        "Tap a product for photos, description, and sizes."
    ].join("\n");
    const rows = products.map((p) => [
        Markup.button.callback(truncBtn(`▸ ${p.title}`, 58), CB.product(p.id))
    ]);
    const navRow = [];
    if (opts.showPrev && opts.prevCb)
        navRow.push(Markup.button.callback("◀ Prev", opts.prevCb));
    if (opts.showNext && opts.nextCb)
        navRow.push(Markup.button.callback("Next ▶", opts.nextCb));
    if (navRow.length)
        rows.push(navRow);
    rows.push(...opts.bottomRows);
    await ctx.reply(text, Markup.inlineKeyboard(rows));
}
async function sendOrdersList(ctx) {
    const user = await upsertUserFromTelegram(ctx.from);
    const orders = await listOrdersForUser(user.id, 10);
    if (!orders.length) {
        await ctx.reply("You have no orders yet.", Markup.inlineKeyboard([[Markup.button.callback("Shop", CB.categories)]]));
        return;
    }
    const lines = orders.map((o) => `#${o.id}\nStatus: ${o.status}\nPayment: ${o.payment_method}\nTotal: ${formatMoney(o.total_cents, o.currency)}\n`);
    await ctx.reply(lines.join("\n"), Markup.inlineKeyboard([[Markup.button.callback("Shop", CB.categories)]]));
}
export function createBot() {
    const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);
    bot.use(async (ctx, next) => {
        if (!ctx.from)
            return next();
        try {
            await upsertUserFromTelegram(ctx.from);
        }
        catch (err) {
            // eslint-disable-next-line no-console
            console.error("upsertUserFromTelegram failed:", err);
            const msg = "Sorry, the shop database is not available. Ask the admin to run supabase/schema.sql in the Supabase SQL editor and check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.";
            if (ctx.callbackQuery) {
                await ctx.answerCbQuery(msg, { show_alert: true }).catch(() => { });
            }
            else {
                await ctx.reply(msg).catch(() => { });
            }
            return;
        }
        return next();
    });
    bot.start(async (ctx) => {
        await ctx.reply("Welcome! Use **Shop** and **Cart** at the bottom, or the buttons below.\n\nTip: open Shop → section → category → pick a product → choose a size.", { parse_mode: "Markdown", ...mainNavKeyboard });
        await ctx.reply("Quick links:", Markup.inlineKeyboard([
            [Markup.button.callback("Open Shop", CB.categories)],
            [Markup.button.callback("Cart", CB.cart)]
        ]));
    });
    bot.hears(/^Shop$/, async (ctx) => {
        await sendCategories(ctx);
    });
    bot.hears(/^Cart$/, async (ctx) => {
        await sendCart(ctx);
    });
    bot.hears(/^My orders$/, async (ctx) => {
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
        if (!isAdmin(ctx))
            return ctx.reply("Not allowed.");
        const text = ctx.message?.text?.replace(/^\/broadcast\s*/i, "")?.trim() ?? "";
        if (!text)
            return ctx.reply("Usage: /broadcast <message>");
        const ids = await listAllUserTelegramIds();
        let ok = 0;
        for (const id of ids) {
            try {
                await ctx.telegram.sendMessage(id, text);
                ok += 1;
            }
            catch {
                // ignore blocked users
            }
        }
        await ctx.reply(`Broadcast sent to ${ok}/${ids.length}.`);
    });
    bot.command("admin_products", async (ctx) => {
        if (!isAdmin(ctx))
            return ctx.reply("Not allowed.");
        const products = await listActiveProducts(30, 0);
        if (!products.length)
            return ctx.reply("No active products.");
        await ctx.reply(products.map((p) => `${p.id} — ${p.title}`).join("\n"));
    });
    bot.command("admin_order", async (ctx) => {
        if (!isAdmin(ctx))
            return ctx.reply("Not allowed.");
        const parts = (ctx.message?.text ?? "").split(/\s+/).slice(1);
        const [orderId, status] = parts;
        if (!orderId || !status)
            return ctx.reply("Usage: /admin_order <orderId> <status>");
        await updateOrderStatus(orderId, status);
        await ctx.reply("Order updated.");
    });
    bot.on("callback_query", async (ctx) => {
        const data = ctx.callbackQuery?.data;
        if (!data)
            return;
        try {
            if (data === CB.cart) {
                await ctx.answerCbQuery();
                await sendCart(ctx);
                return;
            }
            if (data === CB.checkout) {
                await ctx.answerCbQuery();
                await sendCheckoutMenu(ctx);
                return;
            }
            if (data === CB.checkoutCOD || data === CB.checkoutStripe) {
                await ctx.answerCbQuery();
                if (data === CB.checkoutStripe && !env.STRIPE_SECRET_KEY) {
                    await ctx.reply("Online payment is not configured. Use Cash on Delivery or contact the shop.");
                    return;
                }
                const method = data === CB.checkoutCOD ? "cod" : "stripe";
                await createOrderFromCart(ctx, method);
                return;
            }
            if (data.startsWith("cat:")) {
                await ctx.answerCbQuery();
                const offset = Number(data.split(":")[1] ?? 0) || 0;
                await sendCatalog(ctx, offset);
                return;
            }
            if (data === CB.categories) {
                await ctx.answerCbQuery();
                await sendCategories(ctx);
                return;
            }
            if (data.startsWith("catc:")) {
                await ctx.answerCbQuery();
                const [, categoryId, offsetStr] = data.split(":");
                const offset = Number(offsetStr ?? 0) || 0;
                if (!categoryId)
                    return;
                await sendCatalog(ctx, offset, categoryId);
                return;
            }
            if (data.startsWith("mainm:")) {
                await ctx.answerCbQuery();
                const mainId = data.slice("mainm:".length);
                if (!mainId)
                    return;
                await sendSubCategories(ctx, mainId);
                return;
            }
            if (data.startsWith("maina:")) {
                await ctx.answerCbQuery();
                const [, mainId, offsetStr] = data.split(":");
                const offset = Number(offsetStr ?? 0) || 0;
                if (!mainId)
                    return;
                await sendCatalogByMain(ctx, mainId, offset);
                return;
            }
            if (data.startsWith("p:")) {
                await ctx.answerCbQuery();
                const productId = data.slice(2);
                await sendProduct(ctx, productId);
                return;
            }
            if (data.startsWith("add:")) {
                await ctx.answerCbQuery("Added ✓");
                const variantId = data.slice(4);
                const user = await upsertUserFromTelegram(ctx.from);
                await addToCart(user.id, variantId, 1);
                let line = "Added to your cart.";
                try {
                    const v = await getVariantSummary(variantId);
                    line = `Added: ${v.title} — size ${v.size} — ${formatMoney(v.price_cents, v.currency)}`;
                }
                catch {
                    /* ignore */
                }
                await ctx.reply(line, Markup.inlineKeyboard([
                    [Markup.button.callback("View cart", CB.cart)],
                    [Markup.button.callback("Keep shopping", CB.categories)]
                ]));
                return;
            }
            if (data.startsWith("qty:")) {
                await ctx.answerCbQuery();
                const [, cartItemId, qtyStr] = data.split(":");
                const qty = Number(qtyStr);
                if (!cartItemId || !Number.isFinite(qty))
                    return;
                await updateCartQty(cartItemId, qty);
                await sendCart(ctx);
                return;
            }
        }
        catch (e) {
            await ctx.reply(`Error: ${e?.message ?? "unknown"}`);
        }
    });
    return bot;
}
function isAdmin(ctx) {
    const id = ctx.from?.id;
    return id != null && env.ADMIN_IDS.includes(id);
}
async function sendCatalog(ctx, offset, categoryId) {
    const products = categoryId
        ? await listActiveProductsByCategory(categoryId, PAGE_SIZE, offset)
        : await listActiveProducts(PAGE_SIZE, offset);
    if (!products.length) {
        await ctx.reply(categoryId ? "No products in this category yet." : "No products found.", Markup.inlineKeyboard([
            [Markup.button.callback("All sections", CB.categories)],
            [Markup.button.callback("Cart", CB.cart)]
        ]));
        return;
    }
    const heading = categoryId ? await getCategoryHeading(categoryId) : "All products";
    const prevCb = categoryId
        ? CB.categoryPage(categoryId, Math.max(0, offset - PAGE_SIZE))
        : CB.catalogPage(Math.max(0, offset - PAGE_SIZE));
    const nextCb = categoryId
        ? CB.categoryPage(categoryId, offset + products.length)
        : CB.catalogPage(offset + products.length);
    await sendProductBrowse(ctx, products, {
        heading,
        pageLabel: `Items ${offset + 1}–${offset + products.length}`,
        prevCb,
        nextCb,
        showPrev: offset > 0,
        showNext: products.length === PAGE_SIZE,
        bottomRows: [
            [Markup.button.callback("All sections", CB.categories)],
            [Markup.button.callback("Cart", CB.cart)]
        ]
    });
}
async function sendCategories(ctx) {
    const mains = await listActiveMainCategories();
    if (!mains.length) {
        await sendCatalog(ctx, 0);
        return;
    }
    const buttons = mains.map((m) => [Markup.button.callback(m.name, CB.mainPick(m.id))]);
    buttons.push([Markup.button.callback("All products", CB.catalogPage(0))]);
    await ctx.reply("Choose a section (Man / Woman / Kid):", Markup.inlineKeyboard(buttons));
}
async function sendSubCategories(ctx, mainCategoryId) {
    const subs = await listActiveCategoriesByMain(mainCategoryId);
    const mains = await listActiveMainCategories();
    const mainName = mains.find((m) => m.id === mainCategoryId)?.name ?? "This section";
    if (!subs.length) {
        await ctx.reply(`No sub-categories in ${mainName} yet. Browse all products in this section, or ask an admin to add categories.`, Markup.inlineKeyboard([
            [Markup.button.callback(`All ${mainName} products`, CB.mainAll(mainCategoryId, 0))],
            [Markup.button.callback("« Back to sections", CB.categories)]
        ]));
        return;
    }
    const rows = subs.map((c) => [Markup.button.callback(c.name, CB.categoryPage(c.id, 0))]);
    rows.push([Markup.button.callback(`All ${mainName} products`, CB.mainAll(mainCategoryId, 0))]);
    rows.push([Markup.button.callback("« Back to sections", CB.categories)]);
    await ctx.reply(`Choose a category in ${mainName}:`, Markup.inlineKeyboard(rows));
}
async function sendCatalogByMain(ctx, mainCategoryId, offset) {
    const products = await listActiveProductsByMainCategory(mainCategoryId, 6, offset);
    if (!products.length) {
        await ctx.reply("No products in this section yet.", Markup.inlineKeyboard([
            [Markup.button.callback("« Back", CB.mainPick(mainCategoryId))],
            [Markup.button.callback("All sections", CB.categories)]
        ]));
        return;
    }
    for (const p of products) {
        const desc = [p.title, p.description].filter(Boolean).join("\n");
        const kb = Markup.inlineKeyboard([
            [Markup.button.callback("View sizes", CB.product(p.id))],
            [Markup.button.callback("Cart", CB.cart)]
        ]);
        if (p.image_url)
            await ctx.replyWithPhoto({ url: p.image_url }, { caption: desc, ...kb });
        else
            await ctx.reply(desc, kb);
    }
    const nextOffset = offset + products.length;
    const nav = Markup.inlineKeyboard([
        [
            ...(offset > 0
                ? [Markup.button.callback("Prev", CB.mainAll(mainCategoryId, Math.max(0, offset - 6)))]
                : []),
            Markup.button.callback("Next", CB.mainAll(mainCategoryId, nextOffset))
        ],
        [Markup.button.callback("« Section", CB.mainPick(mainCategoryId))],
        [Markup.button.callback("All sections", CB.categories)]
    ]);
    await ctx.reply("Catalog navigation", nav);
}
async function sendProduct(ctx, productId) {
    const p = await getProduct(productId);
    const variants = await listActiveVariants(productId);
    if (!variants.length) {
        await ctx.reply("No sizes available for this product.");
        return;
    }
    const buttons = variants.map((v) => [
        Markup.button.callback(`${v.size} • ${formatMoney(v.price_cents, v.currency)}`, CB.variantAdd(v.id))
    ]);
    const kb = Markup.inlineKeyboard([
        ...buttons,
        [Markup.button.callback("View cart", CB.cart)],
        [Markup.button.callback("All sections", CB.categories)]
    ]);
    const text = [p.title, p.description].filter(Boolean).join("\n");
    if (p.image_url)
        await ctx.replyWithPhoto({ url: p.image_url }, { caption: text, ...kb });
    else
        await ctx.reply(text, kb);
}
async function sendCart(ctx) {
    const user = await upsertUserFromTelegram(ctx.from);
    const cart = await getCart(user.id);
    if (!cart.length) {
        await ctx.reply("Your cart is empty.", Markup.inlineKeyboard([
            [Markup.button.callback("Open Shop", CB.categories)],
            [Markup.button.callback("All products", CB.catalogPage(0))]
        ]));
        return;
    }
    let subtotal = 0;
    const lines = [];
    const qtyButtons = [];
    for (const item of cart) {
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
    const currency = cart[0]?.product_variants?.currency ?? "usd";
    const text = `${lines.join("\n")}\n\nSubtotal: ${formatMoney(subtotal, currency)}`;
    const kb = Markup.inlineKeyboard([
        ...qtyButtons,
        [Markup.button.callback("Checkout", CB.checkout)],
        [Markup.button.callback("Keep shopping", CB.categories)]
    ]);
    await ctx.reply(text, kb);
}
async function sendCheckoutMenu(ctx) {
    const rows = [
        [Markup.button.callback("Cash on Delivery", CB.checkoutCOD)]
    ];
    if (env.STRIPE_SECRET_KEY) {
        rows.push([Markup.button.callback("Online payment (Stripe)", CB.checkoutStripe)]);
    }
    rows.push([Markup.button.callback("Back to cart", CB.cart)]);
    await ctx.reply("Choose payment method:", Markup.inlineKeyboard(rows));
}
async function createOrderFromCart(ctx, method) {
    const user = await upsertUserFromTelegram(ctx.from);
    const cart = await getCart(user.id);
    if (!cart.length) {
        await ctx.reply("Cart is empty.");
        return;
    }
    const currency = cart[0]?.product_variants?.currency ?? "usd";
    const items = cart.map((i) => ({
        variantId: i.variant_id,
        qty: i.qty,
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
    await createOrderItems(orderId, items.map((i) => ({ variantId: i.variantId, qty: i.qty })));
    await clearCart(user.id);
    if (method === "cod") {
        await ctx.reply(`Order created: #${orderId}\nPayment: Cash on Delivery\nStatus: pending`);
        return;
    }
    // Stripe is handled in the server (creates Checkout session and returns URL)
    await ctx.reply(`Order created: #${orderId}\nStatus: awaiting_payment\n\nOpen the payment link below:`, Markup.inlineKeyboard([[Markup.button.url("Pay with Stripe", `${env.PUBLIC_BASE_URL}/pay/${orderId}`)]]));
}
