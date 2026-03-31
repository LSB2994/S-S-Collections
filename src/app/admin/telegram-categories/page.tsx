import type { ReactNode, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { ActionModal } from "@/components/admin/ActionModal";
import { ConfirmFormButton } from "@/components/admin/ConfirmFormButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabaseAdminFetch } from "@/lib/supabaseAdmin";

type MainCategory = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  main_category_id: string;
  main_categories: { name: string; slug: string } | null;
};

async function listMainCategories(): Promise<MainCategory[]> {
  return supabaseAdminFetch<MainCategory[]>("/rest/v1/main_categories", {
    query: { select: "id,name,slug,active", order: "name.asc" }
  });
}

async function listCategories(): Promise<Category[]> {
  return supabaseAdminFetch<Category[]>("/rest/v1/categories", {
    query: {
      select: "id,name,slug,active,main_category_id,main_categories(name,slug)",
      order: "name.asc"
    }
  });
}

async function createCategoryAction(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const main_category_id = String(formData.get("main_category_id") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!name || !slug || !main_category_id) throw new Error("Section, name and slug are required");

  await supabaseAdminFetch("/rest/v1/categories", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{ name, slug, active, main_category_id }])
  });
  revalidatePath("/admin/telegram-categories");
  revalidatePath("/admin/telegram-products");
}

async function updateCategoryAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const main_category_id = String(formData.get("main_category_id") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!id || !name || !slug || !main_category_id) throw new Error("Missing category values");

  await supabaseAdminFetch(`/rest/v1/categories?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name, slug, active, main_category_id })
  });
  revalidatePath("/admin/telegram-categories");
  revalidatePath("/admin/telegram-products");
}

async function deleteCategoryAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing category id");
  await supabaseAdminFetch(`/rest/v1/categories?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
  revalidatePath("/admin/telegram-categories");
  revalidatePath("/admin/telegram-products");
}

function Select(
  props: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }
) {
  const { children, className, ...rest } = props;
  return (
    <select
      {...rest}
      className={[
        "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className ?? ""
      ].join(" ")}
    >
      {children}
    </select>
  );
}

export default async function TelegramCategoriesPage({
  searchParams
}: {
  searchParams?: Promise<{ section?: string; q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const [mains, categories] = await Promise.all([listMainCategories(), listCategories()]);
  const q = (params?.q ?? "").trim().toLowerCase();
  const statusFilter = params?.status ?? "all";
  const sectionSlug = (params?.section ?? "").toLowerCase();
  const selectedMain = mains.find((m) => m.slug.toLowerCase() === sectionSlug) ?? mains[0] ?? null;
  const visibleMainIds = selectedMain ? new Set([selectedMain.id]) : new Set<string>();
  const filteredCategories = (selectedMain ? categories.filter((c) => visibleMainIds.has(c.main_category_id)) : categories).filter(
    (c) => {
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "inactive" && c.active) return false;
      if (!q) return true;
      return [c.name, c.slug, c.main_categories?.name ?? ""].join(" ").toLowerCase().includes(q);
    }
  );
  const activeMains = mains.filter((m) => m.active);
  const uniqueDisplayNames = Array.from(new Set(filteredCategories.map((c) => c.name))).sort((a, b) =>
    a.localeCompare(b)
  );
  const uniqueSlugs = Array.from(new Set(filteredCategories.map((c) => c.slug))).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-7">
      <AdminPageHeader
        title="Categories"
        description="Main sections (Man / Woman / Kid) are seeded in the database. Add sub-categories here, then assign products to them on the Products page."
      >
        <AdminSecondaryLink href="/admin/telegram-products">Products & sizes</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            {mains.map((m) => {
              const active = selectedMain?.id === m.id;
              return (
                <Button
                  key={m.id}
                  variant={active ? "default" : "secondary"}
                  size="sm"
                  className={active ? "rounded-xl bg-orange-500 hover:bg-orange-600" : "rounded-xl"}
                  asChild
                >
                  <Link href={`/admin/telegram-categories?section=${encodeURIComponent(m.slug)}`}>{m.name}</Link>
                </Button>
              );
            })}
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-3">
            <input type="hidden" name="section" value={selectedMain?.slug ?? ""} />
            <Input name="q" placeholder="Search display name or slug..." defaultValue={params?.q ?? ""} />
            <Select name="status" defaultValue={statusFilter}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Button type="submit" className="md:justify-self-start">
              Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>New sub-category</CardTitle>
          <CardDescription>
            Slug must be unique within the section (e.g. <code className="rounded bg-muted px-1.5 py-0.5 text-xs">t-shirts</code>).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCategoryAction} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <div className="space-y-2">
              <Label>Main section</Label>
              <Select name="main_category_id" required defaultValue={selectedMain?.id ?? ""}>
                <option value="" disabled>
                  Choose section…
                </option>
                {activeMains.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input name="name" placeholder="T-Shirts" list="subcategory-name-suggestions" required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input name="slug" placeholder="t-shirts" list="subcategory-slug-suggestions" required />
            </div>
            <div className="flex flex-col gap-3 lg:justify-end">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
                Active
              </label>
              <Button type="submit">Add sub-category</Button>
            </div>
          </form>
          {filteredCategories.length > 0 ? (
            <>
              <datalist id="subcategory-name-suggestions">
                {uniqueDisplayNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <datalist id="subcategory-slug-suggestions">
                {uniqueSlugs.map((slug) => (
                  <option key={slug} value={slug} />
                ))}
              </datalist>
              <p className="mt-3 text-xs text-muted-foreground">
                You can pick an existing sub-category name/slug from suggestions, or type a new one.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {mains
          .filter((main) => !selectedMain || main.id === selectedMain.id)
          .map((main) => {
          const subs = filteredCategories.filter((c) => c.main_category_id === main.id);
          return (
            <Card key={main.id} className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
                <div>
                  <CardTitle className="text-lg">{main.name}</CardTitle>
                  <CardDescription>
                    {main.active ? "Section active" : "Section inactive"} · {subs.length} sub-categor
                    {subs.length === 1 ? "y" : "ies"}
                  </CardDescription>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                {subs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No sub-categories in this section yet. Use the form above to add one (choose this section in the
                    dropdown).
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {subs.map((c) => (
                      <li key={c.id} className="space-y-3 p-4">
                        <form action={updateCategoryAction} className="grid gap-3 lg:grid-cols-6 lg:items-end">
                          <input type="hidden" name="id" value={c.id} />
                          <div className="space-y-2 lg:col-span-1">
                            <Label>Section</Label>
                            <Select name="main_category_id" required defaultValue={c.main_category_id}>
                              {mains.map((m) => (
                                <option
                                  key={m.id}
                                  value={m.id}
                                  disabled={!m.active && m.id !== c.main_category_id}
                                >
                                  {m.name}
                                  {!m.active ? " (inactive)" : ""}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-2 lg:col-span-1">
                            <Label>Display name</Label>
                            <Input name="name" defaultValue={c.name} required />
                          </div>
                          <div className="space-y-2 lg:col-span-1">
                            <Label>Slug</Label>
                            <Input name="slug" defaultValue={c.slug} required />
                          </div>
                          <label className="flex items-center gap-2 text-sm lg:items-end">
                            <input type="checkbox" name="active" defaultChecked={c.active} className="size-4 accent-primary" />
                            Active
                          </label>
                          <div className="lg:col-span-2">
                            <Button type="submit" variant="secondary">
                              Save
                            </Button>
                          </div>
                        </form>
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <ConfirmFormButton
                            message={`Delete sub-category “${c.name}”? Remove it from products first if the delete fails.`}
                            variant="outline"
                            size="sm"
                            className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            Delete
                          </ConfirmFormButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
