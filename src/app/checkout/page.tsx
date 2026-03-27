"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { getBanks } from "@/lib/firestore";
import type { Bank } from "@/types";
import { createOrder } from "@/lib/firestore";

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [telegram, setTelegram] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getBanks().then(setBanks).catch(() => setBanks([]));
  }, []);

  useEffect(() => {
    if (banks.length && !selectedBankId) setSelectedBankId(banks[0].id);
  }, [banks, selectedBankId]);

  const selectedBank = banks.find((b) => b.id === selectedBankId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setError("Please enter your phone number so we can contact you.");
      return;
    }
    if (!selectedBankId) {
      setError("Please select a bank.");
      return;
    }
    setLoading(true);
    try {
      const orderId = await createOrder({
        items: items.map(({ product, quantity }) => ({
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity,
        })),
        total: totalAmount,
        contactPhone: trimmedPhone,
        contactTelegram: telegram.trim() || undefined,
        bankId: selectedBankId,
        bankName: selectedBank?.name ?? "",
      });
      clearCart();
      setDone(orderId);
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
              We will contact you at your phone (and Telegram if provided) after you pay. Please
              complete payment to the selected bank QR.
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
        <h1 className="text-xl font-semibold text-stone-800">Payment</h1>
        <p className="mt-1 text-sm text-stone-500">
          Choose a bank, scan the QR to pay, then leave your contact so we can confirm.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Bank selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700">Pay with</label>
            <div className="mt-2 space-y-2">
              {banks.map((bank) => (
                <label
                  key={bank.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                    selectedBankId === bank.id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="bank"
                    value={bank.id}
                    checked={selectedBankId === bank.id}
                    onChange={() => setSelectedBankId(bank.id)}
                    className="h-4 w-4 text-emerald-600"
                  />
                  <span className="font-medium text-stone-800">{bank.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* QR for selected bank */}
          {selectedBank && (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-100">
              <p className="text-sm font-medium text-stone-700">Scan to pay — {selectedBank.name}</p>
              {selectedBank.accountName && (
                <p className="text-sm text-stone-500">Account: {selectedBank.accountName}</p>
              )}
              {selectedBank.accountNumber && (
                <p className="text-sm text-stone-500">{selectedBank.accountNumber}</p>
              )}
              <div className="mt-3 flex justify-center">
                {selectedBank.qrImageUrl ? (
                  <div className="relative h-48 w-48">
                    <Image
                      src={selectedBank.qrImageUrl}
                      alt={`QR ${selectedBank.name}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-48 w-48 items-center justify-center rounded-lg bg-stone-100 text-stone-400">
                    Add QR image in admin
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-lg font-bold text-emerald-600">
                ${totalAmount.toFixed(2)}
              </p>
            </div>
          )}

          {/* Contact */}
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
              Telegram (optional)
            </label>
            <input
              id="telegram"
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
              placeholder="@username"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
