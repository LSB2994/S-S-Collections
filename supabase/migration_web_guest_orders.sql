-- Run once in Supabase SQL editor (existing databases).
-- Guest checkout from the Next.js shop (no Firebase).

create table if not exists public.web_guest_orders (
  id uuid primary key default gen_random_uuid(),
  contact_phone text not null,
  contact_telegram text,
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'usd',
  items jsonb not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Optional: allow anon read for a future dashboard; service role bypasses RLS anyway.
-- alter table public.web_guest_orders enable row level security;

