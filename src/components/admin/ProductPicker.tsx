"use client";

import { useState } from "react";
import { Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Product = { id: string; title: string; active: boolean };

export function ProductPicker({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      {/* Hidden inputs submitted with the parent form */}
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="product_ids" value={id} />
      ))}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-muted/40 transition-colors"
      >
        <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
        {selected.size === 0
          ? <span className="text-muted-foreground">All products</span>
          : <span>{selected.size} product{selected.size > 1 ? "s" : ""} selected</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="font-semibold text-slate-900">Limit to products</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-3">
              <p className="text-xs text-muted-foreground mb-3">
                Leave all unchecked to apply the code to all products.
              </p>
              <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {products.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="size-4 accent-primary shrink-0"
                    />
                    <span className={!p.active ? "text-muted-foreground line-through" : ""}>
                      {p.title}
                    </span>
                    {!p.active && (
                      <span className="ml-auto text-xs text-muted-foreground">(inactive)</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
