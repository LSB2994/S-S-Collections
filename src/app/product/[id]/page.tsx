"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { getProduct } from "@/lib/firestore";
import type { Product } from "@/types";
import { ProductActions } from "./ProductActions";

export default function ProductPage() {
  const params = useParams();
  const id = params?.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((p) => setProduct(p && p.active ? p : null))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-stone-800">
            ← Shop
          </Link>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 text-center text-stone-500">
          Loading…
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-stone-800">
            ← Shop
          </Link>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-12 text-center">
          <p className="text-stone-600">Product not found.</p>
          <Link href="/" className="mt-4 inline-block text-emerald-600 hover:underline">
            Back to shop
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
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-28">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-100">
          <div className="aspect-square relative bg-stone-100">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-400">
                No image
              </div>
            )}
          </div>
          <div className="p-5">
            <h1 className="text-xl font-semibold text-stone-800">{product.name}</h1>
            <p className="mt-2 text-stone-600">{product.description || "No description."}</p>
            <p className="mt-3 text-2xl font-bold text-emerald-600">
              ${product.price.toFixed(2)}
            </p>
            {product.stock < 5 && product.stock > 0 && (
              <p className="text-sm text-amber-600">Only {product.stock} left</p>
            )}
            <ProductActions product={product} />
          </div>
        </div>
      </main>
    </div>
  );
}
