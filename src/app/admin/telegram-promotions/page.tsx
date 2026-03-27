import { revalidatePath } from "next/cache";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { ConfirmFormButton } from "@/components/admin/ConfirmFormButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabaseAdminFetch } from "@/lib/supabaseAdmin";

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

  await supabaseAdminFetch("/rest/v1/discount_codes", {
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

export default async function TelegramPromotionsAdminPage() {
  const codes = await listCodes();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Discount codes"
        description="Create promotion codes (percent or fixed amount off). Your bot must apply these at checkout — this page only maintains the codes in Supabase."
      >
        <AdminSecondaryLink href="/admin/telegram-products">Products</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      <Card>
        <CardHeader>
          <CardTitle>New code</CardTitle>
          <CardDescription>Codes are stored uppercase. Amount-off is in cents.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCodeAction} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input name="code" placeholder="SPRING10" required />
              </div>
              <div className="space-y-2">
                <Label>Usage limit (optional)</Label>
                <Input name="usage_limit" type="number" min={1} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  name="mode"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  defaultValue="percent"
                >
                  <option value="percent">Percent off</option>
                  <option value="amount">Amount off (cents)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Percent off</Label>
                <Input name="percent_off" type="number" min={1} max={100} defaultValue={10} />
              </div>
              <div className="space-y-2">
                <Label>Amount off (cents)</Label>
                <Input name="amount_off_cents" type="number" min={0} defaultValue={0} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Starts at (optional)</Label>
                <Input name="starts_at" placeholder="ISO date, e.g. 2026-03-26T00:00:00Z" />
              </div>
              <div className="space-y-2">
                <Label>Ends at (optional)</Label>
                <Input name="ends_at" placeholder="ISO date" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
              Active
            </label>

            <Button type="submit">Create code</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All codes</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {codes.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">No codes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.code}</TableCell>
                    <TableCell>
                      {c.percent_off != null && c.percent_off > 0
                        ? `${c.percent_off}%`
                        : c.amount_off_cents != null && c.amount_off_cents > 0
                          ? `$${(c.amount_off_cents / 100).toFixed(2)} off`
                          : "—"}
                    </TableCell>
                    <TableCell>
                      {c.usage_count}
                      {c.usage_limit != null ? ` / ${c.usage_limit}` : ""}
                    </TableCell>
                    <TableCell>{c.active ? "Active" : "Inactive"}</TableCell>
                    <TableCell className="text-right">
                      <form action={toggleCodeAction} className="inline">
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="active" value={String(!c.active)} />
                        <Button type="submit" variant="link" size="sm" className="h-auto px-2">
                          {c.active ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                      <form action={deleteCodeAction} className="ml-2 inline">
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmFormButton
                          message={`Delete discount code ${c.code}?`}
                          variant="link"
                          size="sm"
                          className="h-auto px-2 text-destructive"
                        >
                          Delete
                        </ConfirmFormButton>
                      </form>
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
