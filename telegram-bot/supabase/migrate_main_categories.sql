-- Run once if you already applied an older schema.sql where `categories` had no `main_category_id`.
-- Safe to run multiple times.

create table if not exists public.main_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.main_categories (name, slug, active)
values
  ('Man', 'man', true),
  ('Woman', 'woman', true),
  ('Kid', 'kid', true)
on conflict (slug) do nothing;

alter table public.categories add column if not exists main_category_id uuid references public.main_categories(id) on delete restrict;

alter table public.categories drop constraint if exists categories_name_key;
alter table public.categories drop constraint if exists categories_slug_key;

update public.categories c
set main_category_id = m.id
from public.main_categories m
where c.main_category_id is null and lower(trim(c.slug)) = lower(trim(m.slug));

update public.categories
set main_category_id = (select id from public.main_categories where slug = 'man' limit 1)
where main_category_id is null;

alter table public.categories alter column main_category_id set not null;

do $$ begin
  alter table public.categories add constraint categories_main_slug_unique unique (main_category_id, slug);
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger main_categories_set_updated_at before update on public.main_categories
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
