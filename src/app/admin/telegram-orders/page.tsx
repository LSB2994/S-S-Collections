import { revalidatePath } from "next/cache";
import { ActionModal } from "@/components/admin/ActionModal";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUsdFromCents } from "@/lib/formatMoneyAdmin";
import { supabaseAdminFetch } from "@/lib/supabaseAdmin";

type OrderStatus = "pending" | "awaiting_payment" | "paid" | "shipped" | "delivered" | "cancelled";
type PaymentMethod = "cod" | "stripe";

type OrderRow = {
  id: string;
  user_id: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  delivery_name: string | null;
  delivery_phone: string | null;
  delivery_address: string | null;
  created_at: string;
  users:
    | {
        first_name: string | null;
        last_name: string | null;
        telegram_username: string | null;
        telegram_user_id: number | null;
        phone: string | null;
      }
    | Array<{
        first_name: string | null;
        last_name: string | null;
        telegram_username: string | null;
        telegram_user_id: number | null;
        phone: string | null;
      }>
    | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  qty: number;
  unit_price_cents: number;
  line_total_cents: number;
  product_variants:
    | {
        size: string | null;
        products:
          | {
              title: string | null;
            }
          | Array<{
              title: string | null;
            }>
          | null;
      }
    | Array<{
        size: string | null;
        products:
          | {
              title: string | null;
            }
          | Array<{
              title: string | null;
            }>
          | null;
      }>
    | null;
};

const ORDER_STATUSES: OrderStatus[] = ["pending", "awaiting_payment", "paid", "shipped", "delivered", "cancelled"];

async function listOrders(): Promise<OrderRow[]> {
  return supabaseAdminFetch<OrderRow[]>("/rest/v1/orders", {
    query: {
      select:
        "id,user_id,status,payment_method,subtotal_cents,discount_cents,total_cents,currency,delivery_name,delivery_phone,delivery_address,created_at,users(first_name,last_name,telegram_username,telegram_user_id,phone)",
      order: "created_at.desc"
    }
  });
}

async function listOrderItems(orderId: string): Promise<OrderItemRow[]> {
  return supabaseAdminFetch<OrderItemRow[]>("/rest/v1/order_items", {
    query: {
      select: "id,order_id,qty,unit_price_cents,line_total_cents,product_variants(size,products(title))",
      order_id: `eq.${orderId}`
    }
  });
}

async function updateOrderStatusAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id) throw new Error("Missing order id");
  if (!ORDER_STATUSES.includes(status)) throw new Error("Invalid status");

  await supabaseAdminFetch(`/rest/v1/orders?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status })
  });
  revalidatePath("/admin/telegram-orders");
}

function toUser(user: OrderRow["users"]) {
  const row = Array.isArray(user) ? user[0] : user;
  if (!row) return null;
  return row;
}

function toVariant(row: OrderItemRow["product_variants"]) {
  return Array.isArray(row) ? row[0] : row;
}

function toProductTitle(
  products:
    | { title: string | null }
    | Array<{
        title: string | null;
      }>
    | null
) {
  if (!products) return "Item";
  const row = Array.isArray(products) ? products[0] : products;
  return row?.title ?? "Item";
}

function statusBadgeClass(status: OrderStatus) {
  switch (status) {
    case "paid":
    case "delivered":
      return "bg-emerald-50 text-emerald-700";
    case "shipped":
      return "bg-sky-50 text-sky-700";
    case "awaiting_payment":
    case "pending":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function OrderDetailModal({
  o,
  items,
  updateAction
}: {
  o: OrderRow;
  items: OrderItemRow[];
  updateAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <ActionModal title={`Order ${o.id.slice(0, 8)} details`} triggerLabel="View detail">
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivery</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{o.delivery_name ?? "—"}</p>
            <p className="text-sm text-slate-700">{o.delivery_phone ?? "—"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{o.delivery_address ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amounts</p>
            <p className="mt-1 text-sm">Subtotal: {formatUsdFromCents(o.subtotal_cents, o.currency)}</p>
            <p className="text-sm">Discount: {formatUsdFromCents(o.discount_cents, o.currency)}</p>
            <p className="text-base font-semibold text-slate-900">Total: {formatUsdFromCents(o.total_cents, o.currency)}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-slate-200 overflow-hidden">
          {items.map((item) => {
            const variant = toVariant(item.product_variants);
            const title = toProductTitle(variant?.products ?? null);
            return (
              <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 odd:bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">Size: {variant?.size ?? "—"} · Qty: {item.qty}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums shrink-0">
                  {formatUsdFromCents(item.line_total_cents, o.currency)}
                </span>
              </div>
            );
          })}
        </div>

        <form
          action={updateAction}
          className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
        >
          <input type="hidden" name="id" value={o.id} />
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Update status</p>
            <NativeSelect name="status" defaultValue={o.status}>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </NativeSelect>
          </div>
          <Button type="submit" variant="secondary">Save status</Button>
        </form>
      </div>
    </ActionModal>
  );
}

export default async function TelegramOrdersPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; status?: string; payment?: string }>;
}) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().toLowerCase();
  const statusFilter = params?.status ?? "all";
  const paymentFilter = params?.payment ?? "all";
  const orders = await listOrders();
  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (paymentFilter !== "all" && o.payment_method !== paymentFilter) return false;
    if (!q) return true;
    const user = toUser(o.users);
    const searchBlob = [
      o.id,
      o.delivery_name ?? "",
      o.delivery_phone ?? "",
      o.delivery_address ?? "",
      user?.first_name ?? "",
      user?.last_name ?? "",
      user?.telegram_username ?? "",
      user?.phone ?? ""
    ]
      .join(" ")
      .toLowerCase();
    return searchBlob.includes(q);
  });
  const itemsByOrderId = new Map<string, OrderItemRow[]>(
    await Promise.all(
      filteredOrders.map(async (o) => {
        const rows = await listOrderItems(o.id);
        return [o.id, rows] as const;
      })
    )
  );

  const pendingCount = orders.filter((o) => o.status === "pending" || o.status === "awaiting_payment").length;
  const paidCount = orders.filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "delivered").length;
  const revenueCents = orders
    .filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.total_cents || 0), 0);

  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="Orders"
        description="Manage Telegram orders, review line items, and update delivery status."
      >
        <AdminSecondaryLink href="/admin/telegram-products">Products</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total orders</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{orders.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Pending</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingCount}</p>
            <p className="text-xs text-slate-500">pending + awaiting payment</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Revenue</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{formatUsdFromCents(revenueCents, "usd")}</p>
            <p className="text-xs text-slate-500">{paidCount} paid/shipped/delivered</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order list</CardTitle>
          <CardDescription>Table for quick scan; open a row for full details and status changes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-4">
            <Input name="q" placeholder="Search order, customer, phone..." defaultValue={params?.q ?? ""} />
            <select
              name="status"
              defaultValue={statusFilter}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              name="payment"
              defaultValue={paymentFilter}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="all">All payments</option>
              <option value="cod">COD</option>
              <option value="stripe">Stripe</option>
            </select>
            <Button type="submit" className="md:justify-self-start">
              Filter
            </Button>
          </form>
          {filteredOrders.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No orders yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((o) => {
                      const user = toUser(o.users);
                      const name =
                        [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
                        o.delivery_name ||
                        "Unknown";
                      return (
                        <TableRow key={o.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{o.id.slice(0, 8)}…</p>
                              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{name}</p>
                              <p className="text-xs text-muted-foreground">
                                {user?.telegram_username ? `@${user.telegram_username}` : user?.phone ?? o.delivery_phone ?? "—"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{o.payment_method.toUpperCase()}</TableCell>
                          <TableCell>{formatUsdFromCents(o.total_cents, o.currency)}</TableCell>
                          <TableCell>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(o.status)}`}>
                              {o.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <OrderDetailModal o={o} items={itemsByOrderId.get(o.id) ?? []} updateAction={updateOrderStatusAction} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden space-y-3">
                {filteredOrders.map((o) => {
                  const user = toUser(o.users);
                  const name =
                    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
                    o.delivery_name ||
                    "Unknown";
                  return (
                    <div key={o.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{o.id.slice(0, 8)}…</p>
                          <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(o.status)}`}>
                            {o.status}
                          </span>
                          <span className="text-sm font-semibold tabular-nums">{formatUsdFromCents(o.total_cents, o.currency)}</span>
                          <span className="text-xs text-muted-foreground">{o.payment_method.toUpperCase()}</span>
                        </div>
                      </div>
                      <OrderDetailModal o={o} items={itemsByOrderId.get(o.id) ?? []} updateAction={updateOrderStatusAction} />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
