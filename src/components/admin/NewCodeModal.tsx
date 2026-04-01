"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProductPicker } from "@/components/admin/ProductPicker";

type Product = { id: string; title: string; active: boolean };

export function NewCodeModal({
  products,
  createAction
}: {
  products: Product[];
  createAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1.5" />
        New code
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-semibold text-slate-900">New discount code</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form
              action={async (fd) => { await createAction(fd); setOpen(false); }}
              className="px-6 py-5 space-y-4"
            >
              {/* Code + Usage limit */}
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1.5 flex-1 min-w-36">
                  <Label className="text-xs text-muted-foreground">Code</Label>
                  <Input name="code" placeholder="SPRING10" required className="uppercase" />
                </div>
                <div className="space-y-1.5 w-36">
                  <Label className="text-xs text-muted-foreground">Usage limit <span className="text-muted-foreground/60">(optional)</span></Label>
                  <Input name="usage_limit" type="number" min={1} placeholder="Unlimited" />
                </div>
              </div>

              {/* Type + Values */}
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1.5 w-40">
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <select
                    name="mode"
                    defaultValue="percent"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="percent">Percent off (%)</option>
                    <option value="amount">Fixed amount off</option>
                  </select>
                </div>
                <div className="space-y-1.5 w-28">
                  <Label className="text-xs text-muted-foreground">Percent off</Label>
                  <Input name="percent_off" type="number" min={1} max={100} defaultValue={10} />
                </div>
                <div className="space-y-1.5 w-36">
                  <Label className="text-xs text-muted-foreground">Fixed amount <span className="text-muted-foreground/60">(cents)</span></Label>
                  <Input name="amount_off_cents" type="number" min={0} defaultValue={0} />
                </div>
                <p className="w-full text-xs text-muted-foreground -mt-1">Only the field matching your selected type is used.</p>
              </div>

              {/* Dates */}
              <div className="flex flex-wrap gap-3">
                <div className="space-y-1.5 flex-1 min-w-44">
                  <Label className="text-xs text-muted-foreground">Starts at <span className="text-muted-foreground/60">(optional)</span></Label>
                  <Input name="starts_at" type="datetime-local" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-44">
                  <Label className="text-xs text-muted-foreground">Ends at <span className="text-muted-foreground/60">(optional)</span></Label>
                  <Input name="ends_at" type="datetime-local" />
                </div>
              </div>

              {/* Products */}
              {products.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Limit to products <span className="text-muted-foreground/60">(optional)</span></Label>
                  <ProductPicker products={products} />
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input type="checkbox" name="active" defaultChecked className="size-4 accent-primary" />
                  Active immediately
                </label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit">Create code</Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
