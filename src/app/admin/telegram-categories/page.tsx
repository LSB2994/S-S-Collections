import type { ReactNode, SelectHTMLAttributes } from "react";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Check, SlidersHorizontal, Trash2 } from "lucide-react";
import { AdminPageHeader, AdminSecondaryLink } from "@/components/admin/AdminPageHeader";
import { ConfirmFormButton } from "@/components/admin/ConfirmFormButton";
import { NewCategoryModal } from "@/components/admin/NewCategoryModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabaseAdminFetch } from "@/lib/supabaseAdmin";

type MainCategory = { id: string; name: string; slug: string; active: boolean };
type Category = {
  id: string; name: string; slug: string; active: boolean;
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
    query: { select: "id,name,slug,active,main_category_id,main_categories(name,slug)", order: "name.asc" }
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

function Select(props: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const { children, className, ...rest } = props;
  return (
    <select
      {...rest}
      className={[
        "flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm",
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

  const filteredCategories = categories
    .filter((c) => !selectedMain || c.main_category_id === selectedMain.id)
    .filter((c) => {
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "inactive" && c.active) return false;
      if (!q) return true;
      return [c.name, c.slug, c.main_categories?.name ?? ""].join(" ").toLowerCase().includes(q);
    });

  const activeMains = mains.filter((m) => m.active);
  const allNames = Array.from(new Set(categories.map((c) => c.name))).sort((a, b) => a.localeCompare(b));
  const allSlugs = Array.from(new Set(categories.map((c) => c.slug))).sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categories"
        description="Main sections (Man / Woman / Kid) are seeded in the database. Add sub-categories here, then assign products to them."
      >
        <AdminSecondaryLink href="/admin/telegram-products">Products & sizes</AdminSecondaryLink>
        <AdminSecondaryLink href="/admin">Dashboard</AdminSecondaryLink>
      </AdminPageHeader>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2">
        {mains.map((m) => {
          const isActive = selectedMain?.id === m.id;
          return (
            <Button
              key={m.id}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={isActive ? "rounded-full bg-orange-500 hover:bg-orange-600 border-orange-500" : "rounded-full"}
              asChild
            >
              <Link href={`/admin/telegram-categories?section=${encodeURIComponent(m.slug)}`}>
                {m.name}
                <span className={["ml-1.5 rounded-full px-1.5 py-0.5 text-xs", isActive ? "bg-orange-400/60" : "bg-muted"].join(" ")}>
                  {categories.filter((c) => c.main_category_id === m.id).length}
                </span>
              </Link>
            </Button>
          );
        })}
      </div>

      {/* Category tables per section */}
      <div className="space-y-5">
        {mains
          .filter((main) => !selectedMain || main.id === selectedMain.id)
          .map((main) => {
            const subs = filteredCategories.filter((c) => c.main_category_id === main.id);
            return (
              <Card key={main.id} className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 pb-3 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{main.name}</CardTitle>
                      {!main.active && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Inactive
                        </span>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      {subs.length} sub-categor{subs.length === 1 ? "y" : "ies"}
                    </CardDescription>
                  </div>
                  <NewCategoryModal
                    mains={activeMains}
                    defaultMainId={main.id}
                    createAction={createCategoryAction}
                    nameSuggestions={allNames}
                    slugSuggestions={allSlugs}
                  />
                </CardHeader>
                <Separator />
                <CardContent className="pt-3 pb-0">
                  <form className="flex flex-wrap gap-3">
                    <input type="hidden" name="section" value={main.slug} />
                    <div className="flex-1 min-w-40">
                      <Input name="q" placeholder="Search name or slug…" defaultValue={params?.q ?? ""} className="h-8 text-sm" />
                    </div>
                    <div className="w-36">
                      <Select name="status" defaultValue={statusFilter} className="h-8">
                        <option value="all">All statuses</option>
                        <option value="active">Active only</option>
                        <option value="inactive">Inactive only</option>
                      </Select>
                    </div>
                    <Button type="submit" variant="secondary" size="sm" className="gap-1.5"><SlidersHorizontal className="h-3.5 w-3.5" />Filter</Button>
                  </form>
                </CardContent>
                {subs.length === 0 ? (
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No sub-categories yet.
                  </CardContent>
                ) : (
                  <>
                    {subs.map((c) => (
                      <span key={c.id} style={{ display: "none" }}>
                        <form id={`upd-${c.id}`} action={updateCategoryAction}>
                          <input type="hidden" name="id" value={c.id} />
                        </form>
                        <form id={`del-${c.id}`} action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={c.id} />
                        </form>
                      </span>
                    ))}
                    <div className="hidden sm:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="w-32">Section</TableHead>
                            <TableHead>Display name</TableHead>
                            <TableHead>Slug</TableHead>
                            <TableHead className="w-16 text-center">Active</TableHead>
                            <TableHead className="w-20 text-right" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {subs.map((c) => (
                            <TableRow key={c.id} className="align-middle group">
                              <TableCell className="py-1.5">
                                <Select name="main_category_id" form={`upd-${c.id}`} required defaultValue={c.main_category_id}>
                                  {mains.map((m) => (
                                    <option key={m.id} value={m.id} disabled={!m.active && m.id !== c.main_category_id}>
                                      {m.name}{!m.active ? " (off)" : ""}
                                    </option>
                                  ))}
                                </Select>
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Input name="name" form={`upd-${c.id}`} defaultValue={c.name} required className="h-8" />
                              </TableCell>
                              <TableCell className="py-1.5">
                                <Input name="slug" form={`upd-${c.id}`} defaultValue={c.slug} required className="h-8 font-mono text-xs" />
                              </TableCell>
                              <TableCell className="py-1.5 text-center">
                                <input type="checkbox" name="active" form={`upd-${c.id}`} defaultChecked={c.active} className="size-4 accent-primary cursor-pointer" />
                              </TableCell>
                              <TableCell className="py-1.5">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    type="submit"
                                    form={`upd-${c.id}`}
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                                    title="Save"
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <ConfirmFormButton
                                    form={`del-${c.id}`}
                                    message={`Delete "${c.name}"? Remove it from products first if the delete fails.`}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </ConfirmFormButton>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile list view */}
                    <div className="sm:hidden flex flex-col gap-4 p-4 pt-0">
                      {subs.map((c) => (
                        <div key={c.id} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-1 block">Section</span>
                              <Select name="main_category_id" form={`upd-${c.id}`} required defaultValue={c.main_category_id} className="h-8 text-xs font-semibold bg-slate-50">
                                {mains.map((m) => (
                                  <option key={m.id} value={m.id} disabled={!m.active && m.id !== c.main_category_id}>
                                    {m.name}{!m.active ? " (off)" : ""}
                                  </option>
                                ))}
                              </Select>
                            </div>
                            <div className="flex flex-col items-end pt-5">
                              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                Active
                                <input type="checkbox" name="active" form={`upd-${c.id}`} defaultChecked={c.active} className="size-4 accent-primary cursor-pointer rounded" />
                              </label>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Display Name</span>
                              <Input name="name" form={`upd-${c.id}`} defaultValue={c.name} required className="h-9" />
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider">Slug</span>
                              <Input name="slug" form={`upd-${c.id}`} defaultValue={c.slug} required className="h-9 font-mono text-xs" />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-slate-100">
                            <ConfirmFormButton
                              form={`del-${c.id}`}
                              message={`Delete "${c.name}"? Remove it from products first if the delete fails.`}
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Delete
                            </ConfirmFormButton>
                            <Button
                              type="submit"
                              form={`upd-${c.id}`}
                              size="sm"
                              variant="secondary"
                              className="h-8 px-3 text-green-700 bg-green-100 hover:bg-green-200"
                            >
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                              Save
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}
