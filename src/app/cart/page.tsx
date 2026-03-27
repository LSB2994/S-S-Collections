"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
  const { items, removeItem, setQuantity, totalAmount, totalItems } = useCart();

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-stone-800">
            ← Shop
          </Link>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <p className="text-stone-600">Your cart is empty.</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-xl bg-emerald-600 px-6 py-2 font-medium text-white hover:bg-emerald-700"
          >
            Continue shopping
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-stone-800">
            ← Shop
          </Link>
          <span className="text-sm text-stone-500">{totalItems} items</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-32">
        <ul className="space-y-3">
          {items.map(({ product, quantity }) => (
            <li
              key={product.id}
              className="flex gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-stone-100"
            >
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-stone-400">
                    No img
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-medium text-stone-800 line-clamp-2">{product.name}</h2>
                <p className="text-sm font-semibold text-emerald-600">
                  ${product.price.toFixed(2)}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, Math.max(0, quantity - 1))}
                    className="h-8 w-8 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100"
                  >
                    −
                  </button>
                  <span className="min-w-[1.5rem] text-center text-sm">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(product.id, quantity + 1)}
                    disabled={quantity >= product.stock}
                    className="h-8 w-8 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between">
                <button
                  type="button"
                  onClick={() => removeItem(product.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
                <span className="font-medium text-stone-700">
                  ${(product.price * quantity).toFixed(2)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="text-emerald-600">${totalAmount.toFixed(2)}</span>
          </div>
          <Link
            href="/checkout"
            className="mt-4 block w-full rounded-xl bg-emerald-600 py-3 text-center font-semibold text-white hover:bg-emerald-700"
          >
            Proceed to payment
          </Link>
        </div>
      </main>
    </div>
  );
}
