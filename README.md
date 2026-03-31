# Shop — Next.js + Firebase

A simple e-commerce flow: **customers shop without signing up**; **admins** manage products, stock, and orders. Payment is via **static bank QR**; customers leave **phone and optional Telegram** for contact.

- **Normal users**: Mobile-first web, browse → cart → checkout (choose bank, see QR, enter contact). No registration.
- **Admin**: Web dashboard at `/admin` — products, stock in/out/adjust, stock movement history, orders (with contact links), banks (QR and account details).

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind**
- **Firebase**: Firestore + Auth (admin only)
- **Telegram bot (optional)**: Telegraf runs inside Next.js via **webhooks**
- **Stripe (optional)**: Checkout + webhook for Telegram “Pay” links

## Setup

**→ For detailed Firebase steps (project, auth, Firestore, env, rules), see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md).**

1. **Clone and install**

   ```bash
   cd shop
   npm install
   ```

2. **Firebase**
   - Create a project at [Firebase Console](https://console.firebase.google.com).
   - Enable **Authentication** → Sign-in method → **Email/Password**.
   - Create a Firestore database.
   - Copy `.env.example` to `.env.local` and fill in your Firebase config (Project settings → General → Your apps).

3. **Firestore rules & indexes**
   - In Firebase Console → Firestore → Rules, paste contents of `firestore.rules`.
   - Firestore → Indexes: deploy `firestore.indexes.json` (or create composite indexes when the app first runs and Firestore suggests them).

4. **Admin user**
   - In Firebase Console → Authentication → Users, add a user with email/password. Use this to sign in at `/admin/login`.

5. **Run**

   ```bash
   npm run dev
   ```

   - Shop: [http://localhost:3000](http://localhost:3000)
   - Admin: [http://localhost:3000/admin](http://localhost:3000/admin)

## Telegram bot (Next.js-only webhook mode)

The Telegram bot is implemented **inside Next.js** (no separate service/process).

### Env vars

Add these to your `.env.local` (see `.env.example`):

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `PUBLIC_BASE_URL` (your public HTTPS URL in production)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Optional webhook setup helper: `TELEGRAM_WEBHOOK_SETUP_SECRET`

### Set the webhook

After deploying (or when using a tunnel locally), call:

```bash
curl -X POST "https://<your-domain>/api/telegram/set-webhook" ^
  -H "Authorization: Bearer <TELEGRAM_WEBHOOK_SETUP_SECRET>"
```

Telegram will then send updates to:
`/api/telegram/webhook?secret=<TELEGRAM_WEBHOOK_SECRET>`

## Usage

- **Shop**: Add products in Admin → Products. Customers see only active products. Cart is stored in `localStorage` (no account). At checkout they pick a bank (you add banks and static QR in Admin → Banks), see the QR and total, then enter phone (required) and optional Telegram and place order.
- **Admin**: Sign in at `/admin/login`. Manage products (CRUD, active/inactive, stock field). Use **Stock** to record stock in, stock out, or adjust to a value; all changes are logged in **Stock movement history**. In **Orders** you see contact phone and Telegram and can mark paid/cancel. In **Banks** you add/edit banks with name, QR image URL, and optional account name/number.

## Notes

- Stock is **not** auto-deducted when an order is placed; admin can do a manual **Stock out** when fulfilling.
- Image URLs for products and bank QR can be any public URL (e.g. Firebase Storage, or any image host). Configure `images.remotePatterns` in `next.config.ts` if you restrict domains.
