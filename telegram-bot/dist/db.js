import { supabase } from "./supabase.js";
export async function upsertUserFromTelegram(tg) {
    const { data, error } = await supabase
        .from("users")
        .upsert({
        telegram_user_id: tg.id,
        telegram_username: tg.username ?? null,
        first_name: tg.first_name ?? null,
        last_name: tg.last_name ?? null
    }, { onConflict: "telegram_user_id" })
        .select("id, telegram_user_id, telegram_username, first_name, last_name, phone")
        .single();
    if (error)
        throw error;
    return data;
}
export async function listActiveProducts(limit = 12, offset = 0) {
    const { data, error } = await supabase
        .from("products")
        .select("id, title, description, image_url")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return data ?? [];
}
export async function listActiveProductsByCategory(categoryId, limit = 12, offset = 0) {
    const { data, error } = await supabase
        .from("product_categories")
        .select("products!inner(id, title, description, image_url, active)")
        .eq("category_id", categoryId)
        .eq("products.active", true)
        .range(offset, offset + limit - 1);
    if (error)
        throw error;
    return (data ?? []).flatMap((row) => row.products ?? []);
}
/** Products linked to any sub-category under this main (Man / Woman / Kid). */
export async function listActiveProductsByMainCategory(mainCategoryId, limit = 12, offset = 0) {
    const { data: catRows, error: e1 } = await supabase
        .from("categories")
        .select("id")
        .eq("main_category_id", mainCategoryId)
        .eq("active", true);
    if (e1)
        throw e1;
    const categoryIds = (catRows ?? []).map((c) => c.id);
    if (!categoryIds.length)
        return [];
    const { data, error } = await supabase
        .from("product_categories")
        .select("products!inner(id, title, description, image_url, active)")
        .in("category_id", categoryIds)
        .eq("products.active", true);
    if (error)
        throw error;
    const flat = (data ?? []).flatMap((row) => row.products ?? []);
    const seen = new Set();
    const unique = flat.filter((p) => {
        if (seen.has(p.id))
            return false;
        seen.add(p.id);
        return true;
    });
    unique.sort((a, b) => a.title.localeCompare(b.title));
    return unique.slice(offset, offset + limit);
}
export async function listActiveMainCategories() {
    const { data, error } = await supabase
        .from("main_categories")
        .select("id, name, slug")
        .eq("active", true)
        .order("name", { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
export async function listActiveCategoriesByMain(mainCategoryId) {
    const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, main_category_id")
        .eq("main_category_id", mainCategoryId)
        .eq("active", true)
        .order("name", { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
export async function getProduct(productId) {
    const { data, error } = await supabase
        .from("products")
        .select("id, title, description, image_url, active")
        .eq("id", productId)
        .single();
    if (error)
        throw error;
    return data;
}
/** Lowest active variant price per product (for compact catalog lines). */
export async function minPriceByProductIds(productIds) {
    if (!productIds.length)
        return new Map();
    const { data, error } = await supabase
        .from("product_variants")
        .select("product_id, price_cents, currency")
        .in("product_id", productIds)
        .eq("active", true);
    if (error)
        throw error;
    const map = new Map();
    for (const row of data ?? []) {
        const pid = row.product_id;
        const prev = map.get(pid);
        const cents = row.price_cents;
        if (!prev || cents < prev.price_cents)
            map.set(pid, { price_cents: cents, currency: row.currency });
    }
    return map;
}
export async function getCategoryHeading(categoryId) {
    const { data, error } = await supabase
        .from("categories")
        .select("name, main_categories(name)")
        .eq("id", categoryId)
        .single();
    if (error)
        throw error;
    const sub = data.name;
    const mainRaw = data.main_categories;
    const mainName = Array.isArray(mainRaw) ? mainRaw[0]?.name : mainRaw?.name;
    return mainName ? `${mainName} › ${sub}` : sub;
}
export async function getMainCategoryName(mainCategoryId) {
    const { data, error } = await supabase
        .from("main_categories")
        .select("name")
        .eq("id", mainCategoryId)
        .single();
    if (error)
        throw error;
    return data.name;
}
export async function getVariantSummary(variantId) {
    const { data, error } = await supabase
        .from("product_variants")
        .select("size, price_cents, currency, products(title)")
        .eq("id", variantId)
        .single();
    if (error)
        throw error;
    const row = data;
    const pr = row.products;
    const title = (Array.isArray(pr) ? pr[0]?.title : pr?.title) ?? "Item";
    return { title, size: row.size, price_cents: row.price_cents, currency: row.currency };
}
export async function listActiveVariants(productId) {
    const { data, error } = await supabase
        .from("product_variants")
        .select("id, size, price_cents, currency, stock")
        .eq("product_id", productId)
        .eq("active", true)
        .order("size", { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
export async function addToCart(userId, variantId, qty) {
    const { data: existing, error: e1 } = await supabase
        .from("cart_items")
        .select("id, qty")
        .eq("user_id", userId)
        .eq("variant_id", variantId)
        .maybeSingle();
    if (e1)
        throw e1;
    if (existing) {
        const { error } = await supabase
            .from("cart_items")
            .update({ qty: existing.qty + qty })
            .eq("id", existing.id);
        if (error)
            throw error;
        return;
    }
    const { error } = await supabase.from("cart_items").insert({ user_id: userId, variant_id: variantId, qty });
    if (error)
        throw error;
}
export async function getCart(userId) {
    const { data, error } = await supabase
        .from("cart_items")
        .select("id, qty, variant_id, product_variants(id, size, price_cents, currency, product_id, products(id, title))")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
    if (error)
        throw error;
    return data ?? [];
}
export async function updateCartQty(cartItemId, qty) {
    if (qty <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("id", cartItemId);
        if (error)
            throw error;
        return;
    }
    const { error } = await supabase.from("cart_items").update({ qty }).eq("id", cartItemId);
    if (error)
        throw error;
}
export async function clearCart(userId) {
    const { error } = await supabase.from("cart_items").delete().eq("user_id", userId);
    if (error)
        throw error;
}
export async function findActiveDiscount(code) {
    const { data, error } = await supabase
        .from("discount_codes")
        .select("id, code, percent_off, amount_off_cents, starts_at, ends_at, usage_limit, usage_count, active")
        .eq("code", code)
        .eq("active", true)
        .maybeSingle();
    if (error)
        throw error;
    return data;
}
export async function createOrder(args) {
    const { data, error } = await supabase
        .from("orders")
        .insert({
        user_id: args.userId,
        status: args.status ?? "pending",
        payment_method: args.payment_method,
        currency: args.currency,
        subtotal_cents: args.subtotal_cents,
        discount_cents: args.discount_cents,
        total_cents: args.total_cents,
        discount_code_id: args.discount_code_id ?? null,
        delivery_name: args.delivery_name ?? null,
        delivery_phone: args.delivery_phone ?? null,
        delivery_address: args.delivery_address ?? null
    })
        .select("id")
        .single();
    if (error)
        throw error;
    return data.id;
}
export async function createOrderItems(orderId, items) {
    // Fetch current prices for variants
    const variantIds = [...new Set(items.map((i) => i.variantId))];
    const { data: variants, error: e1 } = await supabase
        .from("product_variants")
        .select("id, price_cents")
        .in("id", variantIds);
    if (e1)
        throw e1;
    const priceById = new Map((variants ?? []).map((v) => [v.id, v.price_cents]));
    const rows = items.map((i) => {
        const unit = priceById.get(i.variantId);
        if (unit == null)
            throw new Error("Variant not found for order item");
        return {
            order_id: orderId,
            variant_id: i.variantId,
            qty: i.qty,
            unit_price_cents: unit,
            line_total_cents: unit * i.qty
        };
    });
    const { error } = await supabase.from("order_items").insert(rows);
    if (error)
        throw error;
}
export async function listOrdersForUser(userId, limit = 10) {
    const { data, error } = await supabase
        .from("orders")
        .select("id, status, payment_method, total_cents, currency, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);
    if (error)
        throw error;
    return data ?? [];
}
export async function updateOrderStatus(orderId, status) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error)
        throw error;
}
export async function setOrderStripeSession(orderId, sessionId) {
    const { error } = await supabase
        .from("orders")
        .update({ stripe_checkout_session_id: sessionId })
        .eq("id", orderId);
    if (error)
        throw error;
}
export async function listAllUserTelegramIds() {
    const { data, error } = await supabase.from("users").select("telegram_user_id");
    if (error)
        throw error;
    return (data ?? []).map((u) => u.telegram_user_id);
}
