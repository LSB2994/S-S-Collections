import Link from "next/link";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { CartBar } from "@/components/shop/CartBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-semibold text-stone-800">
            Shop
          </Link>
          <CartBar />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24">
        <ProductGrid />
      </main>
    </div>
  );
}
