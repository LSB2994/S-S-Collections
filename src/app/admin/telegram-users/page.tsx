import { ArrowRight, DollarSign, MoreHorizontal, Phone, ShoppingBag, SlidersHorizontal, Users } from "lucide-react";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { ActionModal } from "@/components/admin/ActionModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUsdFromCents } from "@/lib/formatMoneyAdmin";
import { supabaseAdminFetch } from "@/lib/supabaseAdmin";

type UserRow = {
  id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  created_at: string;
};

type OrderAgg = {
  user_id: string;
  status: string;
  count: number;
  revenue_cents: number;
  currency: string;
};

async function listUsers(): Promise<UserRow[]> {
  return supabaseAdminFetch<UserRow[]>("/rest/v1/users", { query: { select: "*", order: "created_at.desc" } });
}

async function listOrderAgg(): Promise<OrderAgg[]> {
  const orders = await supabaseAdminFetch<
    Array<{ user_id: string; status: string; total_cents: number; currency: string }>
  >("/rest/v1/orders", { query: { select: "user_id,status,total_cents,currency" } });

  const map = new Map<string, { count: number; revenueCents: number; currency: string }>();
  for (const o of orders) {
    const key = o.user_id;
    const current = map.get(key) ?? { count: 0, revenueCents: 0, currency: o.currency ?? "usd" };
    current.count += 1;
    if (o.status === "paid" || o.status === "shipped" || o.status === "delivered") {
      current.revenueCents += Number(o.total_cents || 0);
    }
    map.set(key, current);
  }

  return Array.from(map.entries()).map(([user_id, v]) => ({
    user_id,
    status: "all",
    count: v.count,
    revenue_cents: v.revenueCents,
    currency: v.currency
  }));
}

function displayName(u: UserRow) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || (u.telegram_username ? `@${u.telegram_username}` : `User ${String(u.telegram_user_id)}`);
}

function Avatar({ u }: { u: UserRow }) {
  const initials = [u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join("").toUpperCase() ||
    (u.telegram_username?.[0] ?? "?").toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-600">
      {initials}
    </div>
  );
}

export default async function TelegramUsersPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; hasPhone?: string }>;
}) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().toLowerCase();
  const hasPhone = params?.hasPhone ?? "all";

  const [users, agg] = await Promise.all([listUsers(), listOrderAgg()]);
  const aggByUserId = new Map(agg.map((a) => [a.user_id, a]));

  const filtered = users.filter((u) => {
    if (hasPhone === "yes" && !u.phone) return false;
    if (hasPhone === "no" && u.phone) return false;
    if (!q) return true;
    return [displayName(u), u.phone ?? "", String(u.telegram_user_id), u.telegram_username ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  const totalRevenue = agg.reduce((sum, a) => sum + a.revenue_cents, 0);
  const withPhone = users.filter((u) => u.phone).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        description="Telegram customers who interacted with your bot."
      >
        <AdminSecondaryLink href="/admin/telegram-orders">Orders</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total users", value: users.length, icon: Users, color: "text-violet-500" },
          { label: "With phone", value: withPhone, icon: Phone, color: "text-sky-500" },
          { label: "With orders", value: agg.length, icon: ShoppingBag, color: "text-orange-500" },
          { label: "Total revenue", value: formatUsdFromCents(totalRevenue, "usd"), icon: DollarSign, color: "text-emerald-500" }
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="rounded-2xl border-slate-200 bg-white shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            All users
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          {/* Filter */}
          <form className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <Input name="q" placeholder="Name, @username, phone, Telegram ID…" defaultValue={params?.q ?? ""} />
            </div>
            <div className="w-40">
              <NativeSelect name="hasPhone" defaultValue={hasPhone}>
                <option value="all">All users</option>
                <option value="yes">Has phone</option>
                <option value="no">No phone</option>
              </NativeSelect>
            </div>
            <Button type="submit" variant="secondary" className="gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />Filter</Button>
          </form>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>User</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-20 text-center">Orders</TableHead>
                <TableHead className="w-28 text-right">Revenue</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No users match your filter.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const a = aggByUserId.get(u.id);
                  return (
                    <TableRow key={u.id} className="align-middle">
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <Avatar u={u} />
                          <span className="font-medium text-slate-900">{displayName(u)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-700">
                          {u.telegram_username ? `@${u.telegram_username}` : "—"}
                        </span>
                        <div className="text-xs text-muted-foreground tabular-nums">{u.telegram_user_id}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.phone
                          ? <span className="font-mono text-xs">{u.phone}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        {a?.count ?? 0}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatUsdFromCents(a?.revenue_cents ?? 0, a?.currency ?? "usd")}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <ActionModal title={`${displayName(u)}`} triggerSize="icon" triggerVariant="ghost" triggerClassName="h-8 w-8" trigger={<><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span></>}>
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <Avatar u={u} />
                                <div>
                                  <p className="font-semibold text-slate-900">{displayName(u)}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Joined {new Date(u.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Contact</p>
                                  <p className="text-sm text-slate-700">{u.phone ?? <span className="text-muted-foreground">No phone</span>}</p>
                                  <p className="text-sm text-slate-700">
                                    {u.telegram_username ? `@${u.telegram_username}` : <span className="text-muted-foreground">No username</span>}
                                  </p>
                                  <p className="text-xs text-muted-foreground tabular-nums">ID: {u.telegram_user_id}</p>
                                </div>
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Stats</p>
                                  <p className="text-sm text-slate-700">{a?.count ?? 0} orders</p>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {formatUsdFromCents(a?.revenue_cents ?? 0, a?.currency ?? "usd")}
                                  </p>
                                </div>
                              </div>

                              <Button asChild variant="secondary" size="sm" className="gap-1.5">
                                <a href={`/admin/telegram-orders?q=${encodeURIComponent(String(u.telegram_user_id))}`}>
                                  View orders <ArrowRight className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            </div>
                          </ActionModal>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
