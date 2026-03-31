import { ActionModal } from "@/components/admin/ActionModal";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
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
  // PostgREST doesn't have group-by easily; we’ll approximate with per-user totals via orders list (small shops).
  // If you need scale, we can add a DB view later.
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

  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="Users"
        description="Telegram customers who interacted with your bot. Search by name, username, phone, or Telegram ID."
      >
        <AdminSecondaryLink href="/admin/telegram-orders">Orders</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & filter</CardTitle>
          <CardDescription>Find users quickly and open details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3">
            <Input name="q" placeholder="Search name, @username, phone, Telegram ID..." defaultValue={params?.q ?? ""} />
            <NativeSelect name="hasPhone" defaultValue={hasPhone}>
              <option value="all">All users</option>
              <option value="yes">Has phone</option>
              <option value="no">No phone</option>
            </NativeSelect>
            <Button type="submit" className="md:justify-self-start">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All users</CardTitle>
          <CardDescription>{filtered.length} users</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Telegram</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const a = aggByUserId.get(u.id);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{displayName(u)}</TableCell>
                    <TableCell className="text-slate-600">
                      {u.telegram_username ? `@${u.telegram_username}` : "—"}
                      <div className="text-xs text-slate-500">{u.telegram_user_id}</div>
                    </TableCell>
                    <TableCell>{u.phone ?? "—"}</TableCell>
                    <TableCell>{a?.count ?? 0}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatUsdFromCents(a?.revenue_cents ?? 0, a?.currency ?? "usd")}
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionModal title={`User: ${displayName(u)}`} triggerLabel="View detail">
                        <div className="space-y-5">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
                              <p className="mt-1 text-sm font-medium text-slate-900">{displayName(u)}</p>
                              <p className="text-sm text-slate-700">{u.phone ?? "—"}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {u.telegram_username ? `@${u.telegram_username}` : "No username"}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Stats</p>
                              <p className="mt-1 text-sm">Orders: {a?.count ?? 0}</p>
                              <p className="text-sm font-semibold text-slate-900">
                                Revenue: {formatUsdFromCents(a?.revenue_cents ?? 0, a?.currency ?? "usd")}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Joined: {new Date(u.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Button asChild variant="secondary">
                            <a href={`/admin/telegram-orders?q=${encodeURIComponent(String(u.telegram_user_id))}`}>
                              Search their orders
                            </a>
                          </Button>
                        </div>
                      </ActionModal>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                    No users match your filter.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

