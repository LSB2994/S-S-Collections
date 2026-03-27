"use client";

import { useCart } from "@/context/CartContext";
import type { Product } from "@/types";

export function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart();

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => addItem(product, 1)}
        disabled={product.stock <= 0}
        className="w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:bg-stone-300 disabled:text-stone-500"
      >
        {product.stock <= 0 ? "Out of stock" : "Add to cart"}
      </button>
    </div>
  );
}
