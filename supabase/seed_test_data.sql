-- Test catalog data for Telegram bot + admin UI.
-- Prerequisites: schema applied; main_categories seeded (Man / Woman / Kid).
-- Safe to re-run: uses ON CONFLICT / DO NOTHING where possible.
-- To wipe only this seed: uncomment the block at the bottom, run it, then re-run this file.

-- ---------------------------------------------------------------------------
-- Sub-categories (under each main section)
-- ---------------------------------------------------------------------------
insert into public.categories (main_category_id, name, slug, active)
select m.id, x.name, x.slug, true
from public.main_categories m
join (
  values
    ('man', 'T-Shirts', 't-shirts'),
    ('man', 'Jeans', 'jeans'),
    ('man', 'Hoodies', 'hoodies'),
    ('woman', 'Dresses', 'dresses'),
    ('woman', 'Tops', 'tops'),
    ('kid', 'T-Shirts', 'kid-t-shirts'),
    ('kid', 'Outerwear', 'kid-outerwear')
) as x(main_slug, name, slug) on m.slug = x.main_slug
on conflict (main_category_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Products (fixed UUIDs so variants / links are stable across re-runs)
-- ---------------------------------------------------------------------------
insert into public.products (id, title, description, image_url, active)
values
  (
    'b1000001-0000-4000-8000-000000000001',
    '[TEST] Classic Tee',
    'Soft cotton tee — sample listing for catalog tests.',
    'https://picsum.photos/seed/testtee1/800/800',
    true
  ),
  (
    'b1000002-0000-4000-8000-000000000002',
    '[TEST] Slim Jeans',
    'Indigo slim fit — sample listing.',
    'https://picsum.photos/seed/testjeans/800/800',
    true
  ),
  (
    'b1000003-0000-4000-8000-000000000003',
    '[TEST] Summer Dress',
    'Lightweight summer dress — sample listing.',
    'https://picsum.photos/seed/testdress/800/800',
    true
  ),
  (
    'b1000004-0000-4000-8000-000000000004',
    '[TEST] Kids Rainbow Tee',
    'Colorful kids tee — sample listing.',
    'https://picsum.photos/seed/testkidtee/800/800',
    true
  ),
  (
    'b1000005-0000-4000-8000-000000000005',
    '[TEST] Fleece Hoodie',
    'Unisex hoodie linked to two sub-categories (tests dedupe in “all section” browse).',
    'https://picsum.photos/seed/testhoodie/800/800',
    true
  )
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  active = excluded.active;

-- ---------------------------------------------------------------------------
-- Variants (sizes / prices)
-- ---------------------------------------------------------------------------
insert into public.product_variants (product_id, size, price_cents, currency, stock, active)
values
  ('b1000001-0000-4000-8000-000000000001', 'S', 2999, 'usd', 12, true),
  ('b1000001-0000-4000-8000-000000000001', 'M', 2999, 'usd', 20, true),
  ('b1000001-0000-4000-8000-000000000001', 'L', 3199, 'usd', 8, true),
  ('b1000002-0000-4000-8000-000000000002', '30', 7900, 'usd', 5, true),
  ('b1000002-0000-4000-8000-000000000002', '32', 7900, 'usd', 6, true),
  ('b1000002-0000-4000-8000-000000000002', '34', 7900, 'usd', 4, true),
  ('b1000003-0000-4000-8000-000000000003', 'XS', 4500, 'usd', 3, true),
  ('b1000003-0000-4000-8000-000000000003', 'S', 4500, 'usd', 5, true),
  ('b1000003-0000-4000-8000-000000000003', 'M', 4500, 'usd', 7, true),
  ('b1000004-0000-4000-8000-000000000004', '4Y', 1999, 'usd', 10, true),
  ('b1000004-0000-4000-8000-000000000004', '6Y', 1999, 'usd', 10, true),
  ('b1000004-0000-4000-8000-000000000004', '8Y', 2199, 'usd', 6, true),
  ('b1000005-0000-4000-8000-000000000005', 'S', 5499, 'usd', 4, true),
  ('b1000005-0000-4000-8000-000000000005', 'M', 5499, 'usd', 6, true),
  ('b1000005-0000-4000-8000-000000000005', 'L', 5699, 'usd', 5, true),
  ('b1000005-0000-4000-8000-000000000005', 'XL', 5699, 'usd', 2, true)
on conflict (product_id, size) do update set
  price_cents = excluded.price_cents,
  stock = excluded.stock,
  active = excluded.active;

-- ---------------------------------------------------------------------------
-- Product ↔ sub-category links
-- ---------------------------------------------------------------------------
insert into public.product_categories (product_id, category_id)
select p.id, c.id
from public.products p
cross join lateral (values
  ('b1000001-0000-4000-8000-000000000001', 'man', 't-shirts'),
  ('b1000002-0000-4000-8000-000000000002', 'man', 'jeans'),
  ('b1000003-0000-4000-8000-000000000003', 'woman', 'dresses'),
  ('b1000004-0000-4000-8000-000000000004', 'kid', 'kid-t-shirts'),
  ('b1000005-0000-4000-8000-000000000005', 'man', 'hoodies'),
  ('b1000005-0000-4000-8000-000000000005', 'woman', 'tops')
) as x(product_id, main_slug, cat_slug)
join public.main_categories m on m.slug = x.main_slug
join public.categories c on c.main_category_id = m.id and c.slug = x.cat_slug
where p.id = x.product_id::uuid
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Optional: sample discount code
-- ---------------------------------------------------------------------------
insert into public.discount_codes (code, percent_off, active)
values ('TEST10', 10, true)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Wipe seed (uncomment to remove test products + links + variants only)
-- ---------------------------------------------------------------------------
-- delete from public.product_categories where product_id in (
--   select id from public.products where title like '[TEST] %'
-- );
-- delete from public.cart_items where variant_id in (
--   select v.id from public.product_variants v
--   where v.product_id in (select id from public.products where title like '[TEST] %')
-- );
-- delete from public.order_items where variant_id in (
--   select v.id from public.product_variants v
--   where v.product_id in (select id from public.products where title like '[TEST] %')
-- );
-- delete from public.product_variants where product_id in (
--   select id from public.products where title like '[TEST] %'
-- );
-- delete from public.products where title like '[TEST] %';
-- delete from public.discount_codes where code = 'TEST10';

