import { supabaseAdminFetch } from "@/lib/supabaseAdmin";
import { allImageUrls } from "@/lib/productImages";
import type { Product } from "@/types";

type DbProduct = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  /** Present after running the `image_urls` migration. */
  image_urls?: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

type DbVariant = {
  id: string;
  product_id: string;
  size: string;
  price_cents: number;
  currency: string;
  stock: number;
  active: boolean;
};

type DbProductCategory = {
  product_id: string;
  categories:
    | {
        name: string;
        slug: string;
        main_categories: { name: string; slug: string } | null;
      }
    | Array<{
        name: string;
        slug: string;
        main_categories: { name: string; slug: string } | null;
      }>
    | null;
};

type StoreProduct = Product & {
  sizes: string[];
  sections: string[];
  colors: string[];
};

function centsToNumber(priceCents: number) {
  // Admin uses USD cents in seeded data; storefront expects dollars.
  return priceCents / 100;
}

const KNOWN_COLORS = [
  "black",
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
  "gray",
  "grey",
  "beige"
];

function toArrayCategory(
  value: DbProductCategory["categories"]
): Array<{ name: string; slug: string; main_categories: { name: string; slug: string } | null }> {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function inferColors(title: string, description: string | null): string[] {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  return KNOWN_COLORS.filter((c) => text.includes(c));
}

export async function GET() {
  try {
    const products = await supabaseAdminFetch<DbProduct[]>("/rest/v1/products", {
      query: {
        select: "*",
        active: "eq.true",
        order: "created_at.desc"
      }
    });

    const productCategories = await supabaseAdminFetch<DbProductCategory[]>("/rest/v1/product_categories", {
      query: {
        select: "product_id,categories(name,slug,main_categories(name,slug))"
      }
    });
  const sectionByProductId = new Map<string, Set<string>>();
  for (const row of productCategories) {
    const current = sectionByProductId.get(row.product_id) ?? new Set<string>();
    for (const cat of toArrayCategory(row.categories)) {
      const section = cat.main_categories?.name;
      if (section) current.add(section);
    }
    sectionByProductId.set(row.product_id, current);
  }

  // For each product, compute min active variant price + available stock.
  const enriched = await Promise.all(
    products.map(async (p) => {
      const variants = await supabaseAdminFetch<DbVariant[]>("/rest/v1/product_variants", {
        query: {
          select: "id,product_id,size,price_cents,currency,stock,active",
          product_id: `eq.${encodeURIComponent(p.id)}`,
          active: "eq.true"
        }
      });

      const inStock = variants.filter((v) => v.stock > 0);
      const stock = inStock.reduce((sum, v) => sum + Number(v.stock || 0), 0);
      if (stock <= 0) return null;

      const minPriceCents = Math.min(...inStock.map((v) => Number(v.price_cents)));

      const imgs = allImageUrls({ image_url: p.image_url, image_urls: p.image_urls });
      const baseProduct: Product = {
        id: p.id,
        name: p.title,
        description: p.description ?? "",
        imageUrl: imgs[0],
        imageUrls: imgs.length ? imgs : undefined,
        price: centsToNumber(minPriceCents),
        stock,
        active: p.active,
        createdAt: p.created_at,
        updatedAt: p.updated_at ?? p.created_at
      };

      const sizes = Array.from(new Set(inStock.map((v) => String(v.size || "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      );
      const sections = Array.from(sectionByProductId.get(p.id) ?? new Set<string>()).sort((a, b) => a.localeCompare(b));
      const colors = inferColors(p.title, p.description).sort((a, b) => a.localeCompare(b));

      const product: StoreProduct = {
        ...baseProduct,
        sizes,
        sections,
        colors
      };

      return product;
    })
  );

    const storeProducts = enriched.filter(Boolean) as StoreProduct[];
    const facets = {
      sections: Array.from(new Set(storeProducts.flatMap((p) => p.sections))).sort((a, b) => a.localeCompare(b)),
      sizes: Array.from(new Set(storeProducts.flatMap((p) => p.sizes))).sort((a, b) => a.localeCompare(b)),
      colors: Array.from(new Set(storeProducts.flatMap((p) => p.colors))).sort((a, b) => a.localeCompare(b))
    };

    return Response.json({ products: storeProducts, facets });
  } catch (e: any) {
    return Response.json(
      {
        ok: false,
        error: String(e?.message ?? e ?? "Unknown error"),
        hint: "Check Vercel env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      },
      { status: 500 }
    );
  }
}

