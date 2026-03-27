"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export function CartBar() {
  const { totalItems, totalAmount } = useCart();

  return (
    <Link
      href="/cart"
      className="flex items-center gap-2 rounded-full bg-stone-800 px-4 py-2 text-white transition hover:bg-stone-700"
    >
      <span className="text-sm font-medium">Cart</span>
      {totalItems > 0 && (
        <>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
            {totalItems}
          </span>
          <span className="text-sm opacity-90">${totalAmount.toFixed(2)}</span>
        </>
      )}
    </Link>
  );
}
