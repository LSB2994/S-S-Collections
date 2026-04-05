"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal, Power, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Product = { id: string; title: string; active: boolean };

export function CodeActionsMenu({
  codeId,
  codeName,
  isActive,
  products,
  toggleAction,
  deleteAction,
  setProductsAction
}: {
  codeId: string;
  codeName: string;
  isActive: boolean;
  products: Product[];
  toggleAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
  setProductsAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const [showProducts, setShowProducts] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsideBtn = !btnRef.current?.contains(target);
      const outsideDropdown = !dropdownRef.current?.contains(target);
      if (outsideBtn && outsideDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setOpen((v) => !v);
  }

  return (
    <>
      <div className="flex justify-end">
        <button
          ref={btnRef}
          type="button"
          onClick={handleOpen}
          className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted transition-colors"
          aria-label="Actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {open && typeof document !== "undefined" && createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: coords.top, right: coords.right, zIndex: 50 }}
            className="w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {/* Products */}
            <button
              type="button"
              onClick={() => { setShowProducts(true); setOpen(false); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
            >
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              Products
            </button>

            {/* Activate / Deactivate */}
            <form action={toggleAction}>
              <input type="hidden" name="id" value={codeId} />
              <input type="hidden" name="active" value={String(!isActive)} />
              <button
                type="submit"
                className={[
                  "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "text-amber-600 hover:bg-amber-50"
                    : "text-green-600 hover:bg-green-50"
                ].join(" ")}
              >
                <Power className="h-3.5 w-3.5 shrink-0" />
                {isActive ? "Deactivate" : "Activate"}
              </button>
            </form>

            <div className="my-1 border-t border-slate-100" />

            {/* Delete */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setShowDelete(true);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              Delete
            </button>
          </div>,
          document.body
        )}
      </div>

      {/* Products modal */}
      {showProducts && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={() => setShowProducts(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-900">Products: {codeName}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowProducts(false)}>
                Close
              </Button>
            </div>
            <form action={setProductsAction} className="space-y-3">
              <input type="hidden" name="discount_code_id" value={codeId} />
              <p className="text-sm text-muted-foreground">
                Leave all unchecked to apply to all products.
              </p>
              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No products yet.</p>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                  {products.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <input
                        type="checkbox"
                        name="product_ids"
                        value={p.id}
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
              )}
              <div className="flex justify-end pt-1">
                <Button type="submit">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px]"
          onClick={() => setShowDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Confirm Action</h3>
            <p className="mb-6 text-sm text-slate-500">
              Are you sure you want to delete discount code "{codeName}"?
            </p>
            <form action={deleteAction} className="flex items-center justify-center gap-3">
              <input type="hidden" name="id" value={codeId} />
              <Button type="button" variant="outline" onClick={() => setShowDelete(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" onClick={() => setShowDelete(false)}>
                Confirm
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
