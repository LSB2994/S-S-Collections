import { revalidatePath } from "next/cache";
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
import { formatUsdFromCents } from "@/lib/formatMoneyAdmin";
import { supabaseAdminFetch } from "@/lib/supabaseAdmin";

type Product = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
};

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
  const image_url = String(formData.get("image_url") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!title) throw new Error("Title is required");

  await supabaseAdminFetch("/rest/v1/products", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([
      {
        title,
        description: description || null,
        image_url: image_url || null,
        active
      }
    ])
  });

  revalidatePath("/admin/telegram-products");
}

async function updateProductAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image_url = String(formData.get("image_url") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!id) throw new Error("Missing product id");
  if (!title) throw new Error("Title is required");

  await supabaseAdminFetch(`/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      title,
      description: description || null,
      image_url: image_url || null,
      active
    })
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

export default async function TelegramProductsAdminPage() {
  const products = await listProducts();
  const categories = await listCategories();
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

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Products & sizes"
        description="Create catalog items and variants (size, price in cents, stock). Assign each product to sub-categories so the Telegram bot can filter by section."
      >
        <AdminSecondaryLink href="/admin/telegram-categories">Categories</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add product</CardTitle>
            <CardDescription>Basic info; add sizes in the second column or below per product.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createProductAction} className="space-y-4">
              <Field label="Title">
                <Input name="title" required />
              </Field>
              <Field label="Description">
                <Textarea name="description" rows={3} placeholder="Shown in the bot and checkout" />
              </Field>
              <Field label="Image URL">
                <Input name="image_url" placeholder="https://…" />
                <p className="text-xs text-muted-foreground">Direct link to a JPG/PNG/WebP shown in Telegram.</p>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
                Active
              </label>
              <Button type="submit">Create product</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add variant</CardTitle>
            <CardDescription>Size, price in cents, and stock for an existing product.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createVariantAction} className="space-y-4">
              <Field label="Product">
                <NativeSelect name="product_id" required defaultValue="">
                  <option value="" disabled>
                    Select…
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.active ? "active" : "inactive"})
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Size">
                  <Input name="size" placeholder="S / M / L" required />
                </Field>
                <Field label="Currency">
                  <Input name="currency" defaultValue="usd" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price (cents)">
                  <Input name="price_cents" type="number" min={0} defaultValue={1999} required />
                  <p className="text-xs text-muted-foreground">Example: 1999 = $19.99 USD</p>
                </Field>
                <Field label="Stock">
                  <Input name="stock" type="number" min={0} defaultValue={0} required />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
                Active
              </label>
              <Button type="submit">Create variant</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {products.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">On this page</CardTitle>
            <CardDescription>Jump to a product section.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex max-h-40 flex-wrap gap-2 overflow-y-auto" aria-label="Jump to product">
              {products.map((p) => (
                <li key={p.id}>
                  <Button variant="secondary" size="sm" className="max-w-[220px] truncate" asChild>
                    <a href={`#product-${p.id}`}>{p.title}</a>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {products.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No products yet. Add one above, then define sizes and prices.
            </CardContent>
          </Card>
        ) : (
          products.map((p) => {
            const variants = variantsByProductId.get(p.id) ?? [];
            return (
              <Card key={p.id} id={`product-${p.id}`} className="scroll-mt-4">
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl">{p.title}</CardTitle>
                      <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge>
                      <span className="text-xs text-muted-foreground">{variants.length} size(s)</span>
                    </div>
                    <p className="break-all font-mono text-xs text-muted-foreground">{p.id}</p>
                    {p.description ? <CardDescription className="text-foreground/90">{p.description}</CardDescription> : null}
                    {p.image_url ? (
                      <div className="flex flex-wrap items-start gap-4 pt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-28 w-28 rounded-lg border object-cover"
                        />
                        <p className="max-w-md text-sm text-muted-foreground">
                          <a className="break-all text-primary hover:underline" href={p.image_url} target="_blank" rel="noreferrer">
                            Open image URL
                          </a>
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <form action={deleteProductAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <ConfirmFormButton message={`Delete “${p.title}” and all its variants? This cannot be undone.`}>
                      Delete product
                    </ConfirmFormButton>
                  </form>
                </CardHeader>
                <Separator />
                <CardContent className="space-y-4 pt-6">
                  <details className="rounded-lg border bg-muted/30 p-4">
                    <summary className="cursor-pointer text-sm font-medium">Edit product</summary>
                    <form action={updateProductAction} className="mt-4 space-y-4">
                      <input type="hidden" name="id" value={p.id} />
                      <Field label="Title">
                        <Input name="title" defaultValue={p.title} required />
                      </Field>
                      <Field label="Description">
                        <Textarea name="description" rows={3} defaultValue={p.description ?? ""} />
                      </Field>
                      <Field label="Image URL">
                        <Input name="image_url" defaultValue={p.image_url ?? ""} />
                      </Field>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="active" defaultChecked={p.active} className="size-4 accent-primary" />
                        Active
                      </label>
                      <Button type="submit">Save product</Button>
                    </form>
                  </details>

                  <details className="rounded-lg border bg-muted/30 p-4">
                    <summary className="cursor-pointer text-sm font-medium">Assign categories</summary>
                    <form action={setProductCategoriesAction} className="mt-4 space-y-3">
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
                  </details>

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
                              <details className="inline-block max-w-full text-left">
                                <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                                  Edit
                                </summary>
                                <div className="mt-2 w-full min-w-[min(100vw-4rem,24rem)] rounded-lg border bg-card p-4 shadow-md">
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
                                      <input
                                        type="checkbox"
                                        name="active"
                                        defaultChecked={v.active}
                                        className="size-4 accent-primary"
                                      />
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
                              </details>
                            </TableCell>
                          </TableRow>
                        ))}
                        {variants.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                              No variants for this product yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
