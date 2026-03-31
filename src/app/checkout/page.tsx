"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError("Please enter your phone number so we can contact you.");
      return;
    }
    const trimmedTelegram = telegram.trim();
    const normalizedTelegram = trimmedTelegram.replace(/^@+/, "").trim();
    if (!normalizedTelegram) {
      setError("Please enter your Telegram username (e.g. @username) so we can match your bot account.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(({ product, quantity }) => ({
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity,
          })),
          total: totalAmount,
          contactPhone: trimmedPhone,
          contactTelegram: normalizedTelegram,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error || `Order failed (${res.status})`);
        return;
      }
      if (!data.id) {
        setError("Order failed: no order id returned.");
        return;
      }
      clearCart();
      setDone(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !done) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-stone-800">
            ← Shop
          </Link>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <p className="text-stone-600">Your cart is empty.</p>
          <Link href="/" className="mt-4 inline-block text-emerald-600 hover:underline">
            Continue shopping
          </Link>
        </main>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-stone-800">
            ← Shop
          </Link>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <div className="mx-auto max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-stone-100">
            <div className="text-5xl">✓</div>
            <h1 className="mt-4 text-xl font-semibold text-stone-800">Order received</h1>
            <p className="mt-2 text-stone-600">
              We will contact you on Telegram to confirm your order and payment.
            </p>
            <p className="mt-2 text-sm text-stone-500">Order # {done}</p>
            <Link
              href="/"
              className="mt-6 inline-block w-full rounded-xl bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-700"
            >
              Back to shop
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-8">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-4xl px-4 py-3">
          <Link href="/cart" className="text-lg font-semibold text-stone-800">
            ← Cart
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-xl font-semibold text-stone-800">Checkout</h1>
        <p className="mt-1 text-sm text-stone-500">
          Enter your contact details. We will reach out to confirm your order and payment.
        </p>

        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
          <p className="text-sm font-medium text-stone-700">Order total</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">${totalAmount.toFixed(2)}</p>
          <ul className="mt-3 space-y-1 text-sm text-stone-600">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex justify-between gap-2">
                <span className="min-w-0 truncate">
                  {product.name} × {quantity}
                </span>
                <span className="shrink-0">${(product.price * quantity).toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <div className="space-y-3">
            <label htmlFor="phone" className="block text-sm font-medium text-stone-700">
              Phone number <span className="text-red-500">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +855 12 345 678"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
            <label htmlFor="telegram" className="block text-sm font-medium text-stone-700">
              Telegram username <span className="text-red-500">*</span>
            </label>
            <input
              id="telegram"
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              required
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Placing order…" : "Place order"}
          </button>
        </form>
      </main>
    </div>
  );
}
