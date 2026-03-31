import { supabaseAdminFetch } from "@/lib/supabaseAdmin";
import { allImageUrls } from "@/lib/productImages";
import type { Product } from "@/types";

type DbProduct = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_urls?: string[] | null;
  active: boolean;
  created_at: string;
  updated_at: string | null;
};

type DbVariant = {
  id: string;
  product_id: string;
  price_cents: number;
  currency: string;
  stock: number;
  active: boolean;
};

function centsToNumber(priceCents: number) {
  return priceCents / 100;
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    const [product] = await supabaseAdminFetch<DbProduct[]>("/rest/v1/products", {
      query: {
        select: "*",
        id: `eq.${encodeURIComponent(id)}`
      }
    });

    if (!product || !product.active) {
      return Response.json({ product: null }, { status: 404 });
    }

    const variants = await supabaseAdminFetch<DbVariant[]>("/rest/v1/product_variants", {
      query: {
        select: "id,product_id,price_cents,currency,stock,active",
        product_id: `eq.${encodeURIComponent(id)}`,
        active: "eq.true"
      }
    });

    const inStock = variants.filter((v) => v.stock > 0);
    const stock = inStock.reduce((sum, v) => sum + Number(v.stock || 0), 0);
    if (stock <= 0) {
      return Response.json({ product: null }, { status: 404 });
    }

    const minPriceCents = Math.min(...inStock.map((v) => Number(v.price_cents)));

    const imgs = allImageUrls({ image_url: product.image_url, image_urls: product.image_urls });
    const next: Product = {
      id: product.id,
      name: product.title,
      description: product.description ?? "",
      imageUrl: imgs[0],
      imageUrls: imgs.length ? imgs : undefined,
      price: centsToNumber(minPriceCents),
      stock,
      active: true,
      createdAt: product.created_at,
      updatedAt: product.updated_at ?? product.created_at
    };

    return Response.json({ product: next });
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

