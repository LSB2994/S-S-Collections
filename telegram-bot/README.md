## Telegram Clothing Store Bot (Supabase)

Features:
- Product catalog, size selection, shopping cart
- Orders: cash on delivery + Stripe checkout link
- Order history + tracking (status)
- Discount codes
- Customer reviews
- Admin: broadcast promotions + basic admin commands

### Setup

1) Install

```bash
cd shop/telegram-bot
npm install
```

2) Supabase DB
- Create a Supabase project
- In Supabase SQL editor, run `supabase/schema.sql`

3) Env

```bash
copy .env.example .env
```

Fill in:
- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- (optional) `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PUBLIC_BASE_URL`
- `ADMIN_TELEGRAM_IDS` (your Telegram numeric ID)

4) Run

```bash
npm run dev
```

### Seed products (example)

Run in Supabase SQL editor after `schema.sql`:

```sql
insert into public.products (title, description, image_url, active)
values ('Classic T-Shirt', 'Soft cotton tee.', null, true)
returning id;

-- Use the returned product id:
insert into public.product_variants (product_id, size, price_cents, currency, stock, active)
values
  ('<product-id>', 'S', 1999, 'usd', 10, true),
  ('<product-id>', 'M', 1999, 'usd', 10, true),
  ('<product-id>', 'L', 1999, 'usd', 10, true);
```

### Customer commands
- `/start`: start menu
- `/catalog`: browse products
- `/cart`: view cart
- `/orders`: order history + tracking status

### Admin commands
- `/broadcast <message>`: send promo message to all users
- `/admin_products`: quick list of products + IDs
- `/admin_order <orderId> <status>`: update order status (e.g. `paid`, `shipped`, `delivered`, `cancelled`)

