"use client";

import { ChevronDown, ImageIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { primaryImageUrl } from "@/lib/productImages";
import { cn } from "@/lib/utils";

export type VariantProductOption = {
  id: string;
  title: string;
  image_url: string | null;
  image_urls?: string[] | null;
  active: boolean;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ProductThumb({
  src,
  alt,
  className
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);
  if (!src || broken) {
    return (
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md border border-input bg-muted text-muted-foreground",
          className
        )}
        aria-hidden
      >
        <ImageIcon className="size-4" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={cn("size-9 shrink-0 rounded-md border border-input object-cover", className)}
      onError={() => setBroken(true)}
    />
  );
}

function ProductSelectWithImages({
  products,
  value,
  onChange,
  error
}: {
  products: VariantProductOption[];
  value: string;
  onChange: (id: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = products.find((p) => p.id === value);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id="add-variant-product"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-invalid={!!error}
        aria-describedby={error ? "add-variant-product-error" : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-left text-sm shadow-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          error && "border-destructive"
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected ? (
            <>
              <ProductThumb
                src={primaryImageUrl({ image_url: selected.image_url, image_urls: selected.image_urls })}
                alt=""
              />
              <span className="truncate">
                {selected.title} ({selected.active ? "active" : "inactive"})
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select…</span>
          )}
        </span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby="add-variant-product"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-input bg-popover py-1 text-popover-foreground shadow-md"
        >
          {products.map((p) => {
            const isSelected = p.id === value;
            return (
              <li key={p.id} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/60"
                  )}
                  onClick={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <ProductThumb
                    src={primaryImageUrl({ image_url: p.image_url, image_urls: p.image_urls })}
                    alt={p.title}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {p.title} ({p.active ? "active" : "inactive"})
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {error ? (
        <p id="add-variant-product-error" className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AddVariantForm({
  action,
  products
}: {
  action: (formData: FormData) => Promise<void>;
  products: VariantProductOption[];
}) {
  const [productId, setProductId] = useState("");
  const [productError, setProductError] = useState<string | undefined>();

  return (
    <form
      action={action}
      className="space-y-4"
      onSubmit={(e) => {
        if (!productId) {
          e.preventDefault();
          setProductError("Select a product");
        } else {
          setProductError(undefined);
        }
      }}
    >
      <input type="hidden" name="product_id" value={productId} />
      <Field label="Product">
        <ProductSelectWithImages
          products={products}
          value={productId}
          onChange={(id) => {
            setProductId(id);
            setProductError(undefined);
          }}
          error={productError}
        />
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
  );
}
