-- Run once in Supabase SQL editor (existing databases).
-- Optional: scopes discount codes to specific products.

create table if not exists public.discount_code_products (
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (discount_code_id, product_id)
);

