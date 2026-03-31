import { revalidatePath } from "next/cache";
import { AddVariantForm } from "@/components/admin/AddVariantForm";
import { ActionModal } from "@/components/admin/ActionModal";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { ConfirmFormButton } from "@/components/admin/ConfirmFormButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Layers3, MoreVertical, PackagePlus } from "lucide-react";

type Product = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  /** Set after DB migration adding `image_urls`. */
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

/** DB without migration: `image_urls` column missing → PGRST204. Retry with legacy `image_url` only. */
function isMissingImageUrlsColumnError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("image_urls") && (msg.includes("PGRST204") || msg.includes("schema cache"));
}

async function insertProductRow(row: Record<string, unknown>) {
  try {
    return await supabaseAdminFetch<Product[] | Product>("/rest/v1/products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([row])
    });
  } catch (e) {
    if (!isMissingImageUrlsColumnError(e)) throw e;
    const { image_urls, ...legacy } = row;
    void image_urls;
    return await supabaseAdminFetch<Product[] | Product>("/rest/v1/products", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify([legacy])
    });
  }
}

async function patchProductRow(id: string, row: Record<string, unknown>) {
  try {
    await supabaseAdminFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row)
    });
  } catch (e) {
    if (!isMissingImageUrlsColumnError(e)) throw e;
    const { image_urls, ...legacy } = row;
    void image_urls;
    await supabaseAdminFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(legacy)
    });
  }
}

type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  main_categories: { name: string; slug: string } | null;
};

type Variant = {
  id: string;
  product_id: string;
  size: string;
  price_cents: number;
  currency: string;
  stock: number;
  active: boolean;
};

async function listProducts(): Promise<Product[]> {
  return supabaseAdminFetch<Product[]>("/rest/v1/products", {
    query: { select: "*", order: "created_at.desc" }
  });
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
  const categoryIds = formData
    .getAll("create_category_ids")
    .map((v) => String(v))
    .filter(Boolean);

  if (!title) throw new Error("Title is required");

  const created = await insertProductRow({
    title,
    description: description || null,
    image_url,
    image_urls,
    active
  });

  const row = Array.isArray(created) ? created[0] : created;
  const productId = row?.id;
  if (productId && categoryIds.length > 0) {
    await supabaseAdminFetch("/rest/v1/product_categories", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(categoryIds.map((category_id) => ({ product_id: productId, category_id })))
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

  await patchProductRow(id, {
    title,
    description: description || null,
    image_url,
    image_urls,
    active
  });

  revalidatePath("/admin/telegram-products");
}

async function deleteProductAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing product id");

  await supabaseAdminFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

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
    method: "POST",
    headers: { Prefer: "return=representation" },
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
  if (!Number.isFinite(price_cents) || price_cents < 0) throw new Error("Invalid price_cents");
  if (!Number.isFinite(stock) || stock < 0) throw new Error("Invalid stock");

  await supabaseAdminFetch(`/rest/v1/product_variants?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ size, price_cents, currency, stock, active })
  });

  revalidatePath("/admin/telegram-products");
}

async function deleteVariantAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing variant id");

  await supabaseAdminFetch(`/rest/v1/product_variants?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE"
  });

  revalidatePath("/admin/telegram-products");
}

async function setProductCategoriesAction(formData: FormData) {
  "use server";
  const productId = String(formData.get("product_id") ?? "");
  if (!productId) throw new Error("Missing product id");
  const categoryIds = formData
    .getAll("category_ids")
    .map((v) => String(v))
    .filter(Boolean);

  await supabaseAdminFetch(`/rest/v1/product_categories?product_id=eq.${encodeURIComponent(productId)}`, {
    method: "DELETE"
  });

  if (categoryIds.length > 0) {
    await supabaseAdminFetch("/rest/v1/product_categories", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(categoryIds.map((category_id) => ({ product_id: productId, category_id })))
    });
  }

  revalidatePath("/admin/telegram-products");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
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
  const activeProducts = products.filter((p) => p.active).length;
  const variantsByProductId = new Map<string, Variant[]>(
    await Promise.all(
      products.map(async (p) => {
        const variants = await listVariants(p.id);
        return [p.id, variants] as const;
      })
    )
  );
  const categoryIdsByProductId = new Map<string, Set<string>>(
    await Promise.all(
      products.map(async (p) => {
        const categoryIds = await listProductCategoryIds(p.id);
        return [p.id, new Set(categoryIds)] as const;
      })
    )
  );
  const totalVariants = Array.from(variantsByProductId.values()).reduce((sum, rows) => sum + rows.length, 0);
  const inStockVariants = Array.from(variantsByProductId.values())
    .flat()
    .filter((v) => v.active && v.stock > 0).length;
  const categoryCountByProductId = new Map(
    products.map((p) => [p.id, (categoryIdsByProductId.get(p.id) ?? new Set<string>()).size] as const)
  );
  const filteredProducts = products.filter((p) => {
    if (statusFilter === "active" && !p.active) return false;
    if (statusFilter === "inactive" && p.active) return false;
    const categoryCount = categoryCountByProductId.get(p.id) ?? 0;
    if (linkedFilter === "linked" && categoryCount === 0) return false;
    if (linkedFilter === "unlinked" && categoryCount > 0) return false;
    if (!q) return true;
    return [p.title, p.description ?? "", p.id].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="Products & sizes"
        description="Create catalog items and variants (size, price in cents, stock). Assign each product to sub-categories so the Telegram bot can filter by section."
      >
        <AdminSecondaryLink href="/admin/telegram-categories">Categories</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Products</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{products.length}</p>
            <p className="text-xs text-slate-500">{activeProducts} active</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Variants</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{totalVariants}</p>
            <p className="text-xs text-slate-500">{inStockVariants} in stock</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Categories</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{categories.length}</p>
            <p className="text-xs text-slate-500">linked across main sections</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>Create</CardTitle>
            <CardDescription>Keep the page clean — open forms only when needed.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <ActionModal
              title="Add product"
              trigger={
                <span className="inline-flex items-center gap-2">
                  <PackagePlus className="size-4" />
                  Add product
                </span>
              }
              triggerVariant="default"
            >
              <form action={createProductAction} className="space-y-4">
                <Field label="Title">
                  <Input name="title" required />
                </Field>
                <Field label="Description">
                  <Textarea name="description" rows={3} placeholder="Shown in the bot and checkout" />
                </Field>
                <div className="space-y-2">
                  <Label>Image URLs</Label>
                  <ProductImageUrlsField name="image_urls" />
                  <p className="text-xs text-muted-foreground">
                    One or more direct links (JPG/PNG/WebP). First image becomes the thumbnail.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Display name list (sub-categories)</Label>
                  {categories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No categories yet. Create them under{" "}
                      <a className="text-primary underline" href="/admin/telegram-categories">
                        Telegram categories
                      </a>
                      .
                    </p>
                  ) : (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {categories.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="create_category_ids"
                              value={c.id}
                              className="size-4 accent-primary"
                            />
                            {c.main_categories?.name ? `${c.main_categories.name} › ` : ""}
                            {c.name}
                            {!c.active ? " (inactive)" : ""}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Products with no category still save, but they will not appear in browse until you assign one.
                      </p>
                    </>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
                  Active
                </label>
                <Button type="submit">Create product</Button>
              </form>
            </ActionModal>

            <ActionModal
              title="Add variant"
              trigger={
                <span className="inline-flex items-center gap-2">
                  <Layers3 className="size-4" />
                  Add variant
                </span>
              }
            >
              <AddVariantForm action={createVariantAction} products={products} />
            </ActionModal>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Search & filter products</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4">
            <Input name="q" placeholder="Search title, description, id..." defaultValue={params?.q ?? ""} />
            <NativeSelect name="status" defaultValue={statusFilter}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
            <NativeSelect name="linked" defaultValue={linkedFilter}>
              <option value="all">All category links</option>
              <option value="linked">Linked to categories</option>
              <option value="unlinked">No category</option>
            </NativeSelect>
            <Button type="submit" className="md:justify-self-start">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="py-10 text-center text-muted-foreground">
            No products yet. Add one above, then define sizes and prices.
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="py-10 text-center text-muted-foreground">
            No products match your search/filter.
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Products</CardTitle>
            <CardDescription>Manage product info, categories, and size variants.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Variants</TableHead>
                  <TableHead>Categories</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => {
                  const variants = variantsByProductId.get(p.id) ?? [];
                  const catCount = categoryCountByProductId.get(p.id) ?? 0;
                  const img = allImageUrls(p)[0];
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt="" className="h-10 w-10 rounded-lg border object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-lg border bg-slate-50" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{p.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell>{variants.length}</TableCell>
                      <TableCell>{catCount}</TableCell>
                      <TableCell className="text-right">
                        <ActionModal
                          title={`Actions: ${p.title}`}
                          triggerSize="icon"
                          triggerVariant="ghost"
                          triggerClassName="h-9 w-9"
                          trigger={
                            <>
                              <MoreVertical className="size-4" />
                              <span className="sr-only">Actions</span>
                            </>
                          }
                        >
                          <div className="space-y-4">
                            <details className="rounded-xl border bg-white px-4 py-3">
                              <summary className="cursor-pointer text-sm font-medium">Edit product</summary>
                              <div className="pt-3">
                                <form action={updateProductAction} className="space-y-4">
                                  <input type="hidden" name="id" value={p.id} />
                                  <Field label="Title">
                                    <Input name="title" defaultValue={p.title} required />
                                  </Field>
                                  <Field label="Description">
                                    <Textarea name="description" rows={3} defaultValue={p.description ?? ""} />
                                  </Field>
                                  <div className="space-y-2">
                                    <Label>Image URLs</Label>
                                    <ProductImageUrlsField key={p.id} name="image_urls" initialUrls={allImageUrls(p)} />
                                  </div>
                                  <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" name="active" defaultChecked={p.active} className="size-4 accent-primary" />
                                    Active
                                  </label>
                                  <Button type="submit">Save</Button>
                                </form>
                              </div>
                            </details>

                            <details className="rounded-xl border bg-white px-4 py-3">
                              <summary className="cursor-pointer text-sm font-medium">Categories</summary>
                              <div className="pt-3">
                                <form action={setProductCategoriesAction} className="space-y-3">
                                  <input type="hidden" name="product_id" value={p.id} />
                                  {categories.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No categories yet. Create them under Categories.</p>
                                  ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      {categories.map((c) => (
                                        <label key={c.id} className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            name="category_ids"
                                            value={c.id}
                                            defaultChecked={categoryIdsByProductId.get(p.id)?.has(c.id)}
                                            className="size-4 accent-primary"
                                          />
                                          {c.main_categories?.name ? `${c.main_categories.name} › ` : ""}
                                          {c.name} {!c.active ? "(inactive)" : ""}
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                  <Button type="submit" variant="secondary">
                                    Save categories
                                  </Button>
                                </form>
                              </div>
                            </details>

                            <details className="rounded-xl border bg-white px-4 py-3">
                              <summary className="cursor-pointer text-sm font-medium">Variants</summary>
                              <div className="pt-3">
                                <div className="overflow-x-auto rounded-lg border">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Stock</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {variants.map((v) => (
                                        <TableRow key={v.id}>
                                          <TableCell className="font-medium">{v.size}</TableCell>
                                          <TableCell>{formatUsdFromCents(v.price_cents, v.currency)}</TableCell>
                                          <TableCell>{v.stock}</TableCell>
                                          <TableCell>{v.active ? "Active" : "Inactive"}</TableCell>
                                          <TableCell className="text-right">
                                            <ActionModal title={`Edit variant: ${p.title} / ${v.size}`} triggerLabel="Edit">
                                              <div className="w-full min-w-[min(100vw-4rem,24rem)]">
                                                <form action={updateVariantAction} className="space-y-3">
                                                  <input type="hidden" name="id" value={v.id} />
                                                  <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Size">
                                                      <Input name="size" defaultValue={v.size} required />
                                                    </Field>
                                                    <Field label="Currency">
                                                      <Input name="currency" defaultValue={v.currency} required />
                                                    </Field>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Price (cents)">
                                                      <Input name="price_cents" type="number" min={0} defaultValue={v.price_cents} required />
                                                    </Field>
                                                    <Field label="Stock">
                                                      <Input name="stock" type="number" min={0} defaultValue={v.stock} required />
                                                    </Field>
                                                  </div>
                                                  <label className="flex items-center gap-2 text-sm">
                                                    <input type="checkbox" name="active" defaultChecked={v.active} className="size-4 accent-primary" />
                                                    Active
                                                  </label>
                                                  <Button type="submit" size="sm">
                                                    Save variant
                                                  </Button>
                                                </form>
                                                <form action={deleteVariantAction} className="mt-2">
                                                  <input type="hidden" name="id" value={v.id} />
                                                  <ConfirmFormButton
                                                    message={`Remove size ${v.size} from this product?`}
                                                    variant="link"
                                                    size="sm"
                                                    className="h-auto px-0 text-destructive"
                                                  >
                                                    Delete variant
                                                  </ConfirmFormButton>
                                                </form>
                                              </div>
                                            </ActionModal>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                      {variants.length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                                            No variants for this product yet.
                                          </TableCell>
                                        </TableRow>
                                      ) : null}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </details>

                            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3">
                              <p className="text-sm font-medium text-destructive">Danger zone</p>
                              <form action={deleteProductAction} className="mt-2">
                                <input type="hidden" name="id" value={p.id} />
                                <ConfirmFormButton
                                  message={`Delete “${p.title}” and all its variants? This cannot be undone.`}
                                  variant="outline"
                                  size="sm"
                                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                                >
                                  Delete product
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
