import Link from "next/link";
import Image from "next/image";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { CartBar } from "@/components/shop/CartBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="S&S Collections"
              width={32}
              height={32}
              className="rounded-md"
              priority
            />
            <span className="text-lg font-semibold text-stone-800">S&S Collections</span>
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
