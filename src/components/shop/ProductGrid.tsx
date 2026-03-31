"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { useCart } from "@/context/CartContext";

type StoreProduct = Product & {
  sizes?: string[];
  sections?: string[];
  colors?: string[];
};

type StoreFacets = {
  sections: string[];
  sizes: string[];
  colors: string[];
};

export function ProductGrid() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [facets, setFacets] = useState<StoreFacets>({ sections: [], sizes: [], colors: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [size, setSize] = useState("all");
  const [color, setColor] = useState("all");
  const { addItem } = useCart();

  useEffect(() => {
    fetch("/api/store/products")
      .then(async (r) => {
        if (!r.ok) return { products: [] as StoreProduct[], facets: { sections: [], sizes: [], colors: [] } };
        return (await r.json()) as { products: StoreProduct[]; facets: StoreFacets };
      })
      .then((data) => {
        setProducts(data.products ?? []);
        setFacets(data.facets ?? { sections: [], sizes: [], colors: [] });
      })
      .catch(() => {
        setProducts([]);
        setFacets({ sections: [], sizes: [], colors: [] });
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = products.filter((p) => {
    const matchesQuery =
      !query.trim() ||
      [p.name, p.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase());
    const matchesSection = section === "all" || (p.sections ?? []).includes(section);
    const matchesSize = size === "all" || (p.sizes ?? []).includes(size);
    const matchesColor = color === "all" || (p.colors ?? []).includes(color);
    return matchesQuery && matchesSection && matchesSize && matchesColor;
  });

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square animate-pulse rounded-xl bg-stone-200" />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
        <p className="text-base font-medium text-stone-700">No products yet.</p>
        <p className="mt-1 text-sm text-stone-500">Add active products with in-stock variants from admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product..."
            className="h-10 rounded-xl border border-stone-200 px-3 text-sm outline-none ring-0 placeholder:text-stone-400 focus:border-stone-300"
          />
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="h-10 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-300"
          >
            <option value="all">Man / Woman / Kid</option>
            {facets.sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="h-10 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-300"
          >
            <option value="all">All sizes</option>
            {facets.sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 rounded-xl border border-stone-200 px-3 text-sm outline-none focus:border-stone-300 disabled:bg-stone-50"
            disabled={facets.colors.length === 0}
            title={facets.colors.length === 0 ? "No color data yet" : "Filter by color"}
          >
            <option value="all">{facets.colors.length === 0 ? "Color (coming soon)" : "All colors"}</option>
            {facets.colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center shadow-sm">
          <p className="text-base font-medium text-stone-700">No matching products.</p>
          <button
            type="button"
            className="mt-3 rounded-lg border border-stone-200 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50"
            onClick={() => {
              setQuery("");
              setSection("all");
              setSize("all");
              setColor("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-100 transition hover:ring-stone-200"
            >
              <Link href={`/product/${p.id}`} className="block flex-1 overflow-hidden">
                <div className="aspect-square relative bg-stone-100">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-stone-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h2 className="line-clamp-2 font-medium text-stone-800">{p.name}</h2>
                  <p className="mt-0.5 text-sm font-semibold text-emerald-600">
                    ${p.price.toFixed(2)}
                  </p>
                  {p.stock < 5 && p.stock > 0 && (
                    <p className="text-xs text-amber-600">Only {p.stock} left</p>
                  )}
                </div>
              </Link>
              <div className="p-3 pt-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (p.stock > 0) addItem(p, 1);
                  }}
                  disabled={p.stock <= 0}
                  className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:bg-stone-300 disabled:text-stone-500"
                >
                  {p.stock <= 0 ? "Out of stock" : "Add to cart"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
