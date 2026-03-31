"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import type { Product } from "@/types";
import { ProductActions } from "./ProductActions";

export default function ProductPage() {
  const params = useParams();
  const id = params?.id as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/store/products/${encodeURIComponent(id)}`)
      .then(async (r) => {
        if (!r.ok) return null;
        const data = (await r.json()) as { product: Product | null };
        return data.product;
      })
      .then((p) => {
        setImageIndex(0);
        setProduct(p && p.active ? p : null);
      })
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

  const gallery =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [];

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
          <div className="bg-stone-100">
            <div className="aspect-square relative">
              {gallery.length > 0 ? (
                <Image
                  src={gallery[Math.min(imageIndex, gallery.length - 1)]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                  sizes="100vw"
                />
              ) : (
                <div className="flex h-full min-h-[min(100vw,24rem)] items-center justify-center text-stone-400">
                  No image
                </div>
              )}
            </div>
            {gallery.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto border-t border-stone-200 bg-white p-3">
                {gallery.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    onClick={() => setImageIndex(i)}
                    className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2 transition ${
                      i === imageIndex ? "ring-emerald-600" : "ring-transparent hover:ring-stone-300"
                    }`}
                    aria-label={`Photo ${i + 1}`}
                  >
                    <Image src={url} alt="" fill className="object-cover" sizes="56px" />
                  </button>
                ))}
              </div>
            ) : null}
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
