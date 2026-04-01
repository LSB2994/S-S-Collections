import Link from "next/link";
import { ArrowRight, LayoutGrid, Package, ShoppingBag, Tag, Ticket, Users } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUsdFromCents } from "@/lib/formatMoneyAdmin";
import { supabaseAdminCount, supabaseAdminFetch } from "@/lib/supabaseAdmin";

type OrderRow = {
  id: string;
  status: "pending" | "awaiting_payment" | "paid" | "shipped" | "delivered" | "cancelled";
  total_cents: number;
  currency: string;
  created_at: string;
  delivery_name: string | null;
};

const STATUS_CONFIG: Record<OrderRow["status"], { label: string; pill: string }> = {
  paid:            { label: "Paid",            pill: "bg-green-100 text-green-700" },
  delivered:       { label: "Delivered",       pill: "bg-emerald-100 text-emerald-700" },
  shipped:         { label: "Shipped",         pill: "bg-sky-100 text-sky-700" },
  pending:         { label: "Pending",         pill: "bg-amber-100 text-amber-700" },
  awaiting_payment:{ label: "Awaiting payment",pill: "bg-amber-100 text-amber-700" },
  cancelled:       { label: "Cancelled",       pill: "bg-slate-100 text-slate-500" },
};

export default async function AdminDashboardPage() {
  const [productsCount, ordersCount, categoriesCount, promosCount, usersCount, allOrders, recentOrders] =
    await Promise.all([
      supabaseAdminCount("/rest/v1/products"),
      supabaseAdminCount("/rest/v1/orders"),
      supabaseAdminCount("/rest/v1/categories"),
      supabaseAdminCount("/rest/v1/discount_codes"),
      supabaseAdminCount("/rest/v1/users"),
      supabaseAdminFetch<OrderRow[]>("/rest/v1/orders", {
        query: { select: "id,status,total_cents,currency", order: "created_at.desc" }
      }),
      supabaseAdminFetch<OrderRow[]>("/rest/v1/orders", {
        query: { select: "id,status,total_cents,currency,created_at,delivery_name", order: "created_at.desc", limit: "8" }
      })
    ]);

  const totalRevenue = allOrders
    .filter((o) => ["paid", "shipped", "delivered"].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total_cents || 0), 0);

  const statusCounts = allOrders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: "Products", value: productsCount, href: "/admin/telegram-products", icon: Package, color: "text-orange-500" },
    { label: "Orders", value: ordersCount, href: "/admin/telegram-orders", icon: ShoppingBag, color: "text-sky-500" },
    { label: "Users", value: usersCount, href: "/admin/telegram-users", icon: Users, color: "text-violet-500" },
    { label: "Revenue", value: formatUsdFromCents(totalRevenue, "usd"), href: "/admin/telegram-orders", icon: Tag, color: "text-emerald-500" },
    { label: "Categories", value: categoriesCount, href: "/admin/telegram-categories", icon: LayoutGrid, color: "text-slate-500" },
    { label: "Promo codes", value: promosCount, href: "/admin/telegram-promotions", icon: Ticket, color: "text-pink-500" },
  ];

  const navLinks = [
    { label: "Products & sizes", href: "/admin/telegram-products", icon: Package },
    { label: "Orders", href: "/admin/telegram-orders", icon: ShoppingBag },
    { label: "Users", href: "/admin/telegram-users", icon: Users },
    { label: "Categories", href: "/admin/telegram-categories", icon: LayoutGrid },
    { label: "Discount codes", href: "/admin/telegram-promotions", icon: Ticket },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Overview of your Telegram store."
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, href, icon: Icon, color }) => (
          <Link key={label} href={href}>
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <p className="text-2xl font-semibold text-slate-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* Recent orders */}
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Recent orders</CardTitle>
            <Link href="/admin/telegram-orders" className="inline-flex items-center gap-1 text-xs text-orange-600 hover:underline font-medium">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <Separator />
          {recentOrders.length === 0 ? (
            <CardContent className="py-10 text-center text-sm text-muted-foreground">No orders yet.</CardContent>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right w-28">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentOrders.map((o) => {
                      const cfg = STATUS_CONFIG[o.status] ?? { label: o.status, pill: "bg-slate-100 text-slate-500" };
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}…</TableCell>
                          <TableCell className="font-medium">{o.delivery_name || "—"}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.pill}`}>
                              {cfg.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatUsdFromCents(o.total_cents, o.currency)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                            {new Date(o.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden divide-y">
                {recentOrders.map((o) => {
                  const cfg = STATUS_CONFIG[o.status] ?? { label: o.status, pill: "bg-slate-100 text-slate-500" };
                  return (
                    <div key={o.id} className="flex items-center justify-between gap-3 py-3 px-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{o.delivery_name || "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{o.id.slice(0, 8)}… · {new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.pill}`}>
                          {cfg.label}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-slate-900">
                          {formatUsdFromCents(o.total_cents, o.currency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Order status breakdown */}
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Orders by status</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-3 divide-y">
              {(["pending", "awaiting_payment", "paid", "shipped", "delivered", "cancelled"] as OrderRow["status"][]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                const count = statusCounts[s] ?? 0;
                return (
                  <div key={s} className="flex items-center justify-between py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cfg.pill}`}>
                      {cfg.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-slate-700">{count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Quick nav */}
          <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick access</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-2 divide-y">
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 py-2.5 text-sm text-slate-700 hover:text-orange-600 transition-colors"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  {label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
