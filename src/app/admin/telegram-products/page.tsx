import { revalidatePath } from "next/cache";
import { AddVariantForm } from "@/components/admin/AddVariantForm";
import { ActionModal } from "@/components/admin/ActionModal";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { ConfirmFormButton } from "@/components/admin/ConfirmFormButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ProductImageUrlsField } from "@/components/admin/ProductImageUrlsField";
import { formatUsdFromCents } from "@/lib/formatMoneyAdmin";
import { allImageUrls } from "@/lib/productImages";
import { supabaseAdminFetch } from "@/lib/supabaseAdmin";
import { Archive, ArrowRight, Check, CheckCircle, Layers3, MoreVertical, Package, PackagePlus, SlidersHorizontal, Trash2 } from "lucide-react";

type Product = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  active: boolean;
  created_at: string;
};

function parseImageUrlsFromForm(formData: FormData): { image_url: string | null; image_urls: string[] | null } {
  const raw = formData.getAll("image_urls").map((v) => String(v).trim()).filter(Boolean);
  const urls = [...new Set(raw)];
  if (!urls.length) return { image_url: null, image_urls: null };
  return { image_url: urls[0]!, image_urls: urls };
}

function isMissingImageUrlsColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("image_urls") && (msg.includes("PGRST204") || msg.includes("schema cache"));
}

async function insertProductRow(row: Record<string, unknown>) {
  try {
    return await supabaseAdminFetch<Product[] | Product>("/rest/v1/products", {
      method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify([row])
    });
  } catch (e) {
    if (!isMissingImageUrlsColumnError(e)) throw e;
    const { image_urls, ...legacy } = row; void image_urls;
    return await supabaseAdminFetch<Product[] | Product>("/rest/v1/products", {
      method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify([legacy])
    });
  }
}

async function patchProductRow(id: string, row: Record<string, unknown>) {
  try {
    await supabaseAdminFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(row)
    });
  } catch (e) {
    if (!isMissingImageUrlsColumnError(e)) throw e;
    const { image_urls, ...legacy } = row; void image_urls;
    await supabaseAdminFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(legacy)
    });
  }
}

type Category = {
  id: string; name: string; slug: string; active: boolean;
  main_categories: { name: string; slug: string } | null;
};

type Variant = {
  id: string; product_id: string; size: string;
  price_cents: number; currency: string; stock: number; active: boolean;
};

async function listProducts(): Promise<Product[]> {
  return supabaseAdminFetch<Product[]>("/rest/v1/products", { query: { select: "*", order: "created_at.desc" } });
}
async function listVariants(productId: string): Promise<Variant[]> {
  return supabaseAdminFetch<Variant[]>("/rest/v1/product_variants", {
    query: { select: "*", product_id: `eq.${productId}`, order: "size.asc" }
  });
}
async function listCategories(): Promise<Category[]> {
  return supabaseAdminFetch<Category[]>("/rest/v1/categories", {
    query: { select: "id,name,slug,active,main_categories(name,slug)", order: "name.asc" }
  });
}
async function listProductCategoryIds(productId: string): Promise<string[]> {
  const rows = await supabaseAdminFetch<Array<{ category_id: string }>>("/rest/v1/product_categories", {
    query: { select: "category_id", product_id: `eq.${productId}` }
  });
  return rows.map((r) => r.category_id);
}

async function createProductAction(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const { image_url, image_urls } = parseImageUrlsFromForm(formData);
  const active = formData.get("active") === "on";
  const categoryIds = formData.getAll("create_category_ids").map((v) => String(v)).filter(Boolean);
  if (!title) throw new Error("Title is required");
  const created = await insertProductRow({ title, description: description || null, image_url, image_urls, active });
  const row = Array.isArray(created) ? created[0] : created;
  if (row?.id && categoryIds.length > 0) {
    await supabaseAdminFetch("/rest/v1/product_categories", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify(categoryIds.map((category_id) => ({ product_id: row.id, category_id })))
    });
  }
  revalidatePath("/admin/telegram-products");
}

async function updateProductAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const { image_url, image_urls } = parseImageUrlsFromForm(formData);
  const active = formData.get("active") === "on";
  if (!id) throw new Error("Missing product id");
  if (!title) throw new Error("Title is required");
  await patchProductRow(id, { title, description: description || null, image_url, image_urls, active });
  revalidatePath("/admin/telegram-products");
}

async function deleteProductAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id");
  await supabaseAdminFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  revalidatePath("/admin/telegram-products");
}

async function createVariantAction(formData: FormData) {
  "use server";
  const product_id = String(formData.get("product_id") ?? "");
  const size = String(formData.get("size") ?? "").trim();
  const price_cents = Number(formData.get("price_cents") ?? 0);
  const currency = String(formData.get("currency") ?? "usd").trim() || "usd";
  const stock = Number(formData.get("stock") ?? 0);
  const active = formData.get("active") === "on";
  if (!product_id) throw new Error("Missing product id");
  if (!size) throw new Error("Size is required");
  if (!Number.isFinite(price_cents) || price_cents < 0) throw new Error("Invalid price_cents");
  if (!Number.isFinite(stock) || stock < 0) throw new Error("Invalid stock");
  await supabaseAdminFetch("/rest/v1/product_variants", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ product_id, size, price_cents, currency, stock, active }])
  });
  revalidatePath("/admin/telegram-products");
}

async function updateVariantAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const size = String(formData.get("size") ?? "").trim();
  const price_cents = Number(formData.get("price_cents") ?? 0);
  const currency = String(formData.get("currency") ?? "usd").trim() || "usd";
  const stock = Number(formData.get("stock") ?? 0);
  const active = formData.get("active") === "on";
  if (!id) throw new Error("Missing variant id");
  if (!size) throw new Error("Size is required");
  await supabaseAdminFetch(`/rest/v1/product_variants?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ size, price_cents, currency, stock, active })
  });
  revalidatePath("/admin/telegram-products");
}

async function deleteVariantAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing variant id");
  await supabaseAdminFetch(`/rest/v1/product_variants?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  revalidatePath("/admin/telegram-products");
}

async function setProductCategoriesAction(formData: FormData) {
  "use server";
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) throw new Error("Missing product id");
  const categoryIds = formData.getAll("category_ids").map((v) => String(v)).filter(Boolean);
  await supabaseAdminFetch(`/rest/v1/product_categories?product_id=eq.${encodeURIComponent(productId)}`, { method: "DELETE" });
  if (categoryIds.length > 0) {
    await supabaseAdminFetch("/rest/v1/product_categories", {
      method: "POST", headers: { Prefer: "return=representation" },
      body: JSON.stringify(categoryIds.map((category_id) => ({ product_id: productId, category_id })))
    });
  }
  revalidatePath("/admin/telegram-products");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span className={[
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
    ].join(" ")}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function priceRange(variants: Variant[]): string {
  if (!variants.length) return "—";
  const prices = variants.map((v) => v.price_cents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const cur = variants[0]?.currency ?? "usd";
  if (min === max) return formatUsdFromCents(min, cur);
  return `${formatUsdFromCents(min, cur)} – ${formatUsdFromCents(max, cur)}`;
}

export default async function TelegramProductsAdminPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; status?: string; linked?: string }>;
}) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().toLowerCase();
  const statusFilter = params?.status ?? "all";
  const linkedFilter = params?.linked ?? "all";

  const products = await listProducts();
  const categories = await listCategories();

  const variantsByProductId = new Map<string, Variant[]>(
    await Promise.all(products.map(async (p) => [p.id, await listVariants(p.id)] as const))
  );
  const categoryIdsByProductId = new Map<string, Set<string>>(
    await Promise.all(products.map(async (p) => {
      const ids = await listProductCategoryIds(p.id);
      return [p.id, new Set(ids)] as const;
    }))
  );

  const allVariants = Array.from(variantsByProductId.values()).flat();
  const inStockVariants = allVariants.filter((v) => v.active && v.stock > 0).length;
  const activeProducts = products.filter((p) => p.active).length;

  const filteredProducts = products.filter((p) => {
    if (statusFilter === "active" && !p.active) return false;
    if (statusFilter === "inactive" && p.active) return false;
    const catCount = (categoryIdsByProductId.get(p.id) ?? new Set()).size;
    if (linkedFilter === "linked" && catCount === 0) return false;
    if (linkedFilter === "unlinked" && catCount > 0) return false;
    if (!q) return true;
    return [p.title, p.description ?? "", p.id].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Products & sizes"
        description="Manage catalog items, variants (size/price/stock) and category assignments."
      >
        <AdminSecondaryLink href="/admin/telegram-categories">Categories</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total products", value: products.length, icon: Package, color: "text-orange-500" },
          { label: "Active", value: activeProducts, icon: CheckCircle, color: "text-green-500" },
          { label: "Total variants", value: allVariants.length, icon: Layers3, color: "text-sky-500" },
          { label: "In stock", value: inStockVariants, icon: Archive, color: "text-emerald-500" }
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

      {/* Products card */}
      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base">
            Products
            <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredProducts.length})</span>
          </CardTitle>
          <div className="flex gap-2">
            <ActionModal
              title="Add variant"
              trigger={<span className="inline-flex items-center gap-1.5"><Layers3 className="h-4 w-4" />Add variant</span>}
              triggerSize="sm"
              triggerVariant="outline"
            >
              <AddVariantForm action={createVariantAction} products={products} />
            </ActionModal>
            <ActionModal
              title="Add product"
              trigger={<span className="inline-flex items-center gap-1.5"><PackagePlus className="h-4 w-4" />Add product</span>}
              triggerSize="sm"
              triggerVariant="default"
            >
              <form action={createProductAction} className="space-y-4">
                <Field label="Title"><Input name="title" required /></Field>
                <Field label="Description">
                  <Textarea name="description" rows={3} placeholder="Shown in the bot and checkout" />
                </Field>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Image URLs</Label>
                  <ProductImageUrlsField name="image_urls" />
                  <p className="text-xs text-muted-foreground">First image becomes the thumbnail.</p>
                </div>
                {categories.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Categories</Label>
                    <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
                      {categories.map((c) => (
                        <label key={c.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                          <input type="checkbox" name="create_category_ids" value={c.id} className="size-4 accent-primary shrink-0" />
                          <span className={!c.active ? "text-muted-foreground line-through" : ""}>
                            {c.main_categories?.name ? `${c.main_categories.name} › ` : ""}{c.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
                    Active immediately
                  </label>
                  <Button type="submit">Create product</Button>
                </div>
              </form>
            </ActionModal>
          </div>
        </CardHeader>
        <Separator />

        {/* Filter */}
        <CardContent className="pt-3 pb-0">
          <form className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <Input name="q" placeholder="Search title, description, ID…" defaultValue={params?.q ?? ""} className="h-8 text-sm" />
            </div>
            <div className="w-36">
              <NativeSelect name="status" defaultValue={statusFilter} className="h-8 text-sm">
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </NativeSelect>
            </div>
            <div className="w-44">
              <NativeSelect name="linked" defaultValue={linkedFilter} className="h-8 text-sm">
                <option value="all">All category links</option>
                <option value="linked">Has category</option>
                <option value="unlinked">No category</option>
              </NativeSelect>
            </div>
            <Button type="submit" variant="secondary" size="sm" className="gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />Filter</Button>
          </form>
        </CardContent>

        {/* Table */}
        {filteredProducts.length === 0 ? (
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {products.length === 0 ? "No products yet. Add one above." : "No products match your filter."}
          </CardContent>
        ) : (
          <Table className="mt-3">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Product</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="w-36">Price range</TableHead>
                <TableHead className="w-20 text-center">Variants</TableHead>
                <TableHead className="w-20 text-center">In stock</TableHead>
                <TableHead className="w-20 text-center">Cats</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((p) => {
                const variants = variantsByProductId.get(p.id) ?? [];
                const catCount = (categoryIdsByProductId.get(p.id) ?? new Set()).size;
                const inStock = variants.filter((v) => v.active && v.stock > 0).length;
                const img = allImageUrls(p)[0];
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={img} alt="" className="h-10 w-10 shrink-0 rounded-lg border object-cover" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-lg border bg-slate-50" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{p.title}</p>
                          <p className="truncate text-xs text-muted-foreground font-mono">{p.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StatusPill active={p.active} /></TableCell>
                    <TableCell className="text-sm tabular-nums">{priceRange(variants)}</TableCell>
                    <TableCell className="text-center tabular-nums">{variants.length}</TableCell>
                    <TableCell className="text-center">
                      <span className={inStock > 0 ? "text-green-600 font-medium tabular-nums" : "text-muted-foreground tabular-nums"}>
                        {inStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {catCount === 0
                        ? <span className="text-amber-600 text-xs font-medium">none</span>
                        : catCount}
                    </TableCell>
                    <TableCell>
                      <ActionModal
                        title={p.title}
                        triggerSize="icon"
                        triggerVariant="ghost"
                        triggerClassName="h-8 w-8"
                        trigger={<><MoreVertical className="h-4 w-4" /><span className="sr-only">Actions</span></>}
                      >
                        <div className="space-y-3">
                          <details className="rounded-xl border bg-white px-4 py-3 open:pb-4">
                            <summary className="cursor-pointer text-sm font-medium">Edit product</summary>
                            <div className="pt-4 space-y-4">
                              <form action={updateProductAction} className="space-y-4">
                                <input type="hidden" name="id" value={p.id} />
                                <Field label="Title"><Input name="title" defaultValue={p.title} required /></Field>
                                <Field label="Description">
                                  <Textarea name="description" rows={3} defaultValue={p.description ?? ""} />
                                </Field>
                                <div className="space-y-1.5">
                                  <Label className="text-xs text-muted-foreground">Image URLs</Label>
                                  <ProductImageUrlsField key={p.id} name="image_urls" initialUrls={allImageUrls(p)} />
                                </div>
                                <div className="flex items-center justify-between">
                                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                                    <input type="checkbox" name="active" defaultChecked={p.active} className="size-4 accent-primary" />
                                    Active
                                  </label>
                                  <Button type="submit" size="sm" className="gap-1.5"><Check className="h-3.5 w-3.5" />Save</Button>
                                </div>
                              </form>
                            </div>
                          </details>

                          <details className="rounded-xl border bg-white px-4 py-3 open:pb-4">
                            <summary className="cursor-pointer text-sm font-medium">
                              Categories
                              {catCount === 0 && <span className="ml-2 text-xs text-amber-600 font-normal">(none assigned)</span>}
                            </summary>
                            <div className="pt-4">
                              <form action={setProductCategoriesAction} className="space-y-3">
                                <input type="hidden" name="product_id" value={p.id} />
                                {categories.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No categories yet.</p>
                                ) : (
                                  <div className="max-h-56 overflow-y-auto rounded-lg border divide-y">
                                    {categories.map((c) => (
                                      <label key={c.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 transition-colors">
                                        <input
                                          type="checkbox"
                                          name="category_ids"
                                          value={c.id}
                                          defaultChecked={categoryIdsByProductId.get(p.id)?.has(c.id)}
                                          className="size-4 accent-primary shrink-0"
                                        />
                                        <span className={!c.active ? "text-muted-foreground line-through" : ""}>
                                          {c.main_categories?.name ? `${c.main_categories.name} › ` : ""}{c.name}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                                <div className="flex justify-end">
                                  <Button type="submit" size="sm" variant="secondary" className="gap-1.5"><Check className="h-3.5 w-3.5" />Save categories</Button>
                                </div>
                              </form>
                            </div>
                          </details>

                          <details className="rounded-xl border bg-white px-4 py-3 open:pb-4">
                            <summary className="cursor-pointer text-sm font-medium">
                              Variants
                              <span className="ml-2 text-xs font-normal text-muted-foreground">({variants.length})</span>
                            </summary>
                            <div className="pt-4">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead>Size</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead className="w-16 text-center">Stock</TableHead>
                                    <TableHead className="w-20">Status</TableHead>
                                    <TableHead className="w-12" />
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {variants.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                                        No variants yet.
                                      </TableCell>
                                    </TableRow>
                                  ) : variants.map((v) => (
                                    <TableRow key={v.id}>
                                      <TableCell className="font-medium">{v.size}</TableCell>
                                      <TableCell className="tabular-nums">{formatUsdFromCents(v.price_cents, v.currency)}</TableCell>
                                      <TableCell className="text-center tabular-nums">
                                        <span className={v.stock === 0 ? "text-destructive" : ""}>{v.stock}</span>
                                      </TableCell>
                                      <TableCell><StatusPill active={v.active} /></TableCell>
                                      <TableCell>
                                        <ActionModal title={`${p.title} / ${v.size}`} triggerLabel="Edit" triggerSize="sm" triggerVariant="ghost">
                                          <form action={updateVariantAction} className="space-y-4">
                                            <input type="hidden" name="id" value={v.id} />
                                            <div className="grid grid-cols-2 gap-3">
                                              <Field label="Size"><Input name="size" defaultValue={v.size} required /></Field>
                                              <Field label="Currency"><Input name="currency" defaultValue={v.currency} required /></Field>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                              <Field label="Price (cents)"><Input name="price_cents" type="number" min={0} defaultValue={v.price_cents} required /></Field>
                                              <Field label="Stock"><Input name="stock" type="number" min={0} defaultValue={v.stock} required /></Field>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                                <input type="checkbox" name="active" defaultChecked={v.active} className="size-4 accent-primary" />
                                                Active
                                              </label>
                                              <div className="flex gap-2">
                                                <form action={deleteVariantAction}>
                                                  <input type="hidden" name="id" value={v.id} />
                                                  <ConfirmFormButton
                                                    message={`Remove size "${v.size}" from this product?`}
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                                                  >
                                                    <Trash2 className="h-3.5 w-3.5" />Delete
                                                  </ConfirmFormButton>
                                                </form>
                                                <Button type="submit" size="sm" className="gap-1.5"><Check className="h-3.5 w-3.5" />Save</Button>
                                              </div>
                                            </div>
                                          </form>
                                        </ActionModal>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </details>

                          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-destructive">Danger zone</p>
                            <form action={deleteProductAction}>
                              <input type="hidden" name="id" value={p.id} />
                              <ConfirmFormButton
                                message={`Delete "${p.title}" and all its variants? This cannot be undone.`}
                                variant="outline"
                                size="sm"
                                className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />Delete product
                              </ConfirmFormButton>
                            </form>
                          </div>
                        </div>
                      </ActionModal>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
