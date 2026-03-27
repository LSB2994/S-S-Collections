import Link from "next/link";

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-stone-200">
        <h1 className="text-xl font-semibold text-stone-800">Admin</h1>
        <p className="mt-2 text-sm text-stone-600">
          Firebase login was removed. This admin area now uses Supabase-backed pages.
        </p>
        <div className="mt-6">
          <Link
            href="/admin/telegram-products"
            className="inline-flex rounded-lg bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700"
          >
            Open Telegram product manager
          </Link>
        </div>
      </div>
    </div>
  );
}
