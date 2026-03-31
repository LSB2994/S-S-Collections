-- Run once in Supabase SQL editor (existing databases).
-- Adds multi-image support: image_urls[]; keeps image_url as first image for compatibility.

alter table public.products
  add column if not exists image_urls text[];

update public.products
set image_urls = array[image_url]::text[]
where image_url is not null
  and image_url <> ''
  and (image_urls is null or cardinality(image_urls) = 0);

