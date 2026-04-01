"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MainCategory = { id: string; name: string };

export function NewCategoryModal({
  mains,
  defaultMainId,
  createAction,
  nameSuggestions,
  slugSuggestions
}: {
  mains: MainCategory[];
  defaultMainId?: string;
  createAction: (formData: FormData) => Promise<void>;
  nameSuggestions: string[];
  slugSuggestions: string[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Add sub-category</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              action={async (fd) => { await createAction(fd); setOpen(false); }}
              className="px-5 py-4 space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Section</Label>
                <select
                  name="main_category_id"
                  required
                  defaultValue={defaultMainId ?? ""}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="" disabled>Choose…</option>
                  {mains.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Display name</Label>
                <Input name="name" placeholder="T-Shirts" list="modal-name-suggestions" required />
                <datalist id="modal-name-suggestions">
                  {nameSuggestions.map((n) => <option key={n} value={n} />)}
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Slug <span className="text-muted-foreground/60">(unique within section)</span></Label>
                <Input name="slug" placeholder="t-shirts" list="modal-slug-suggestions" required className="font-mono text-sm" />
                <datalist id="modal-slug-suggestions">
                  {slugSuggestions.map((s) => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
                  Active
                </label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit">Add</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
