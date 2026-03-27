"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/lib/firestore";
import type { Product } from "@/types";
import { useCart } from "@/context/CartContext";

export function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    getProducts(true)
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

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
      <div className="rounded-2xl bg-white p-8 text-center text-stone-500 shadow-sm">
        No products yet. Check back soon.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {products.map((p) => (
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
                <div className="flex h-full items-center justify-center text-stone-400 text-sm">
                  No image
                </div>
              )}
            </div>
            <div className="p-3">
              <h2 className="font-medium text-stone-800 line-clamp-2">{p.name}</h2>
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
  );
}
