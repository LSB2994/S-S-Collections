import { revalidatePath } from "next/cache";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { CodeActionsMenu } from "@/components/admin/CodeActionsMenu";
import { NewCodeModal } from "@/components/admin/NewCodeModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SlidersHorizontal } from "lucide-react";
import { supabaseAdminFetch } from "@/lib/supabaseAdmin";

type ProductRow = { id: string; title: string; active: boolean };

type DiscountCode = {
  id: string;
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  usage_count: number;
  created_at: string;
};

async function listCodes(): Promise<DiscountCode[]> {
  return supabaseAdminFetch<DiscountCode[]>("/rest/v1/discount_codes", {
    query: { select: "*", order: "created_at.desc" }
  });
}

async function listProducts(): Promise<ProductRow[]> {
  return supabaseAdminFetch<ProductRow[]>("/rest/v1/products", {
    query: { select: "id,title,active", order: "created_at.desc" }
  });
}

async function listDiscountProductCounts(): Promise<Map<string, number>> {
  const rows = await supabaseAdminFetch<Array<{ discount_code_id: string; product_id: string }>>(
    "/rest/v1/discount_code_products",
    { query: { select: "discount_code_id,product_id" } }
  ).catch(() => [] as Array<{ discount_code_id: string; product_id: string }>);

  const m = new Map<string, number>();
  for (const r of rows) m.set(r.discount_code_id, (m.get(r.discount_code_id) ?? 0) + 1);
  return m;
}

async function createCodeAction(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const mode = String(formData.get("mode") ?? "percent");
  const active = formData.get("active") === "on";
  const starts_at = String(formData.get("starts_at") ?? "").trim();
  const ends_at = String(formData.get("ends_at") ?? "").trim();
  const usage_limit_raw = String(formData.get("usage_limit") ?? "").trim();

  if (!code) throw new Error("Code is required");

  let percent_off: number | null = null;
  let amount_off_cents: number | null = null;
  if (mode === "percent") {
    const p = Number(formData.get("percent_off") ?? 0);
    if (!Number.isFinite(p) || p <= 0 || p > 100) {
      throw new Error("Percent must be between 1 and 100");
    }
    percent_off = p;
  } else {
    const a = Number(formData.get("amount_off_cents") ?? 0);
    if (!Number.isFinite(a) || a < 0) {
      throw new Error("Amount must be >= 0");
    }
    amount_off_cents = a;
  }

  const usage_limit = usage_limit_raw ? Number(usage_limit_raw) : null;
  if (usage_limit_raw && (!Number.isFinite(usage_limit) || (usage_limit ?? 0) <= 0)) {
    throw new Error("usage_limit must be a positive number");
  }

  const created = await supabaseAdminFetch<DiscountCode[] | DiscountCode>("/rest/v1/discount_codes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([
      {
        code,
        percent_off,
        amount_off_cents,
        active,
        starts_at: starts_at || null,
        ends_at: ends_at || null,
        usage_limit
      }
    ])
  });

  const row = Array.isArray(created) ? created[0] : created;
  const codeId = row?.id;
  const productIds = formData
    .getAll("product_ids")
    .map((v) => String(v))
    .filter(Boolean);

  if (codeId && productIds.length) {
    await supabaseAdminFetch("/rest/v1/discount_code_products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(productIds.map((product_id) => ({ discount_code_id: codeId, product_id })))
    }).catch(() => {});
  }

  revalidatePath("/admin/telegram-promotions");
}

async function setCodeProductsAction(formData: FormData) {
  "use server";
  const codeId = String(formData.get("discount_code_id") ?? "");
  if (!codeId) throw new Error("Missing discount_code_id");
  const productIds = formData
    .getAll("product_ids")
    .map((v) => String(v))
    .filter(Boolean);

  await supabaseAdminFetch(`/rest/v1/discount_code_products?discount_code_id=eq.${encodeURIComponent(codeId)}`, {
    method: "DELETE"
  });

  if (productIds.length) {
    await supabaseAdminFetch("/rest/v1/discount_code_products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(productIds.map((product_id) => ({ discount_code_id: codeId, product_id })))
    });
  }

  revalidatePath("/admin/telegram-promotions");
}

async function toggleCodeAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) throw new Error("Missing code id");

  await supabaseAdminFetch(`/rest/v1/discount_codes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ active })
  });

  revalidatePath("/admin/telegram-promotions");
}

async function deleteCodeAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing code id");

  await supabaseAdminFetch(`/rest/v1/discount_codes?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  revalidatePath("/admin/telegram-promotions");
}

export default async function TelegramPromotionsAdminPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().toLowerCase();
  const statusFilter = params?.status ?? "all";
  const [codes, products, productCountByCodeId] = await Promise.all([
    listCodes(),
    listProducts(),
    listDiscountProductCounts()
  ]);
  const filteredCodes = codes.filter((c) => {
    if (statusFilter === "active" && !c.active) return false;
    if (statusFilter === "inactive" && c.active) return false;
    if (!q) return true;
    return c.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Discount codes"
        description="Create promotion codes (percent or fixed amount off). Your bot applies these at checkout — this page maintains the codes in Supabase."
      >
        <AdminSecondaryLink href="/admin/telegram-products">Products</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      {/* All codes */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            All codes
            <span className="ml-2 text-sm font-normal text-muted-foreground">({codes.length})</span>
          </CardTitle>
          <NewCodeModal products={products} createAction={createCodeAction} />
        </CardHeader>
        <Separator />
        <CardContent className="pt-4 space-y-4">
          <form className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <Input name="q" placeholder="Search code…" defaultValue={params?.q ?? ""} />
            </div>
            <div className="w-44">
              <select
                name="status"
                defaultValue={statusFilter}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
            <Button type="submit" variant="secondary" className="gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />Filter</Button>
          </form>

          {filteredCodes.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No codes found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Code</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-20 text-center">Usage</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-semibold tracking-wide">{c.code}</TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {c.percent_off != null && c.percent_off > 0
                          ? `${c.percent_off}% off`
                          : c.amount_off_cents != null && c.amount_off_cents > 0
                            ? `$${(c.amount_off_cents / 100).toFixed(2)} off`
                            : "—"}
                      </span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {productCountByCodeId.get(c.id)
                          ? `${productCountByCodeId.get(c.id)} product(s)`
                          : "All products"}
                      </div>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {c.usage_count}
                      {c.usage_limit != null && (
                        <span className="text-muted-foreground">/{c.usage_limit}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        c.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                      ].join(" ")}>
                        {c.active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <CodeActionsMenu
                        codeId={c.id}
                        codeName={c.code}
                        isActive={c.active}
                        products={products}
                        toggleAction={toggleCodeAction}
                        deleteAction={deleteCodeAction}
                        setProductsAction={setCodeProductsAction}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
