import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function statusDotClass(status: OrderRow["status"]) {
  switch (status) {
    case "paid":
    case "delivered":
      return "bg-emerald-500";
    case "shipped":
      return "bg-sky-500";
    case "awaiting_payment":
    case "pending":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

export default async function AdminDashboardPage() {
  const [productsCount, ordersCount, categoriesCount, promosCount, recentOrders] = await Promise.all([
    supabaseAdminCount("/rest/v1/products"),
    supabaseAdminCount("/rest/v1/orders"),
    supabaseAdminCount("/rest/v1/categories"),
    supabaseAdminCount("/rest/v1/discount_codes"),
    supabaseAdminFetch<OrderRow[]>("/rest/v1/orders", {
      query: { select: "id,status,total_cents,currency,created_at,delivery_name", order: "created_at.desc", limit: "6" }
    })
  ]);

  const metrics = [
    { label: "Total Products", value: productsCount, href: "/admin/telegram-products" },
    { label: "Total Orders", value: ordersCount, href: "/admin/telegram-orders" },
    { label: "Sub-categories", value: categoriesCount, href: "/admin/telegram-categories" },
    { label: "Promo Codes", value: promosCount, href: "/admin/telegram-promotions" }
  ];

  const recentRevenue = recentOrders
    .filter((o) => o.status === "paid" || o.status === "shipped" || o.status === "delivered")
    .reduce((sum, o) => sum + Number(o.total_cents || 0), 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dashboard"
        description="Overview of your Telegram store. Track core metrics and jump to the right admin area quickly."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/telegram-orders">Manage Orders</Link>
        </Button>
      </AdminPageHeader>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{m.label}</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{m.value.toLocaleString()}</p>
              <Link href={m.href} className="mt-2 inline-block text-xs font-medium text-orange-600 hover:underline">
                Open
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <CardDescription>Latest customer activity and payment progress.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.id.slice(0, 8)}…</TableCell>
                    <TableCell>{o.delivery_name || "Unknown"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className={`size-2 rounded-full ${statusDotClass(o.status)}`} />
                        <span className="capitalize">{o.status.replace("_", " ")}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatUsdFromCents(o.total_cents, o.currency)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                      No orders yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Snapshot</CardTitle>
            <CardDescription>Paid/shipped/delivered from recent orders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Recent revenue</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-900">{formatUsdFromCents(recentRevenue, "usd")}</p>
            </div>
            <div className="grid gap-2">
              <Button variant="secondary" asChild>
                <Link href="/admin/telegram-products">Products & Sizes</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/admin/telegram-categories">Categories</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link href="/admin/telegram-promotions">Discount Codes</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
