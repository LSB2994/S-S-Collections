"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type IconName = "dashboard" | "orders" | "categories" | "products" | "discounts" | "users" | "store";

function NavIcon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  const p = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, className, "aria-hidden": true };
  if (name === "dashboard") return (
    <svg {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
  if (name === "orders") return (
    <svg {...p}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
  if (name === "users") return (
    <svg {...p}>
      <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3" />
      <path d="M19 17c0-1.87-1.79-3.4-4-3.86" />
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3 2.69-5 6-5s6 2 6 5" />
    </svg>
  );
  if (name === "categories") return (
    <svg {...p}>
      <path d="M3 5h4v4H3zM3 11h4v4H3zM3 17h4v4H3z" />
      <path d="M11 6h10M11 12h10M11 18h6" />
    </svg>
  );
  if (name === "products") return (
    <svg {...p}>
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
  if (name === "discounts") return (
    <svg {...p}>
      <circle cx="9" cy="9" r="2" />
      <circle cx="15" cy="15" r="2" />
      <path d="M7 17 17 7" />
      <path d="M3.34 14.66A8 8 0 0 1 12 4a8 8 0 0 1 8 8 8 8 0 0 1-8 8 8 8 0 0 1-5.66-2.34" />
    </svg>
  );
  return (
    <svg {...p}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

const groups: {
  title: string;
  links: { href: string; label: string; icon: IconName }[];
}[] = [
  {
    title: "Overview",
    links: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }]
  },
  {
    title: "Telegram shop",
    links: [
      { href: "/admin/telegram-orders", label: "Orders", icon: "orders" },
      { href: "/admin/telegram-users", label: "Users", icon: "users" },
      { href: "/admin/telegram-categories", label: "Categories", icon: "categories" },
      { href: "/admin/telegram-products", label: "Products & sizes", icon: "products" },
      { href: "/admin/telegram-promotions", label: "Discount codes", icon: "discounts" }
    ]
  }
];

function linkActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({
  collapsed,
  onToggleCollapsed
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`z-20 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white/95 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:rounded-r-3xl ${
        collapsed ? "lg:w-20" : "lg:w-72"
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 lg:p-5 ${
          collapsed ? "lg:flex-col lg:items-center lg:px-2 lg:py-3" : "lg:block"
        }`}
      >
        <div
          className={`rounded-2xl border border-slate-200 bg-[#f9fafb] px-3 py-2.5 ${
            collapsed ? "w-auto p-2" : ""
          }`}
        >
          <Link
            href="/admin"
            className={`inline-flex items-center gap-2 font-semibold tracking-tight text-slate-900 ${
              collapsed ? "justify-center" : ""
            }`}
            title="Dashboard"
          >
            <span
              className={`inline-flex items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 ${
                collapsed ? "size-10" : "size-7"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="size-4" aria-hidden="true">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5.5 9.5V20h13V9.5" />
                <path d="M9.5 20v-5h5v5" />
              </svg>
            </span>
            {!collapsed ? <span>Shop admin</span> : null}
          </Link>
          {!collapsed ? <p className="mt-0.5 hidden text-xs text-slate-500 lg:block">Telegram catalog manager</p> : null}
        </div>
        <Button variant="outline" size="sm" className="lg:hidden" asChild>
          <Link href="/">
            <span className="inline-flex items-center gap-2">
              <NavIcon name="store" />
              <span>Store</span>
            </span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`hidden rounded-xl lg:flex ${collapsed ? "mt-2 h-8 w-8 items-center justify-center p-0" : "mt-3 w-full"}`}
          onClick={onToggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className="inline-flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-4"
              aria-hidden="true"
            >
              {collapsed ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6 9 12l6 6" />}
            </svg>
            {!collapsed ? <span>Collapse</span> : null}
          </span>
        </Button>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:p-3">
        {groups.map((group) => (
          <div key={group.title} className="contents lg:block lg:space-y-1 lg:pb-4">
            <p className={`hidden px-2 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 lg:block ${collapsed ? "sr-only" : ""}`}>
              {group.title}
            </p>
            {group.links.map(({ href, label, icon }) => {
              const active = linkActive(pathname, href);
              return (
                <Button
                  key={href}
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className={
                    active
                      ? `whitespace-nowrap rounded-xl bg-orange-500 text-white shadow-sm hover:bg-orange-600 lg:w-full ${collapsed ? "justify-center" : "justify-start lg:whitespace-normal"}`
                      : `whitespace-nowrap rounded-xl text-slate-700 hover:bg-slate-100 lg:w-full ${collapsed ? "justify-center" : "justify-start lg:whitespace-normal"}`
                  }
                  asChild
                >
                  <Link href={href} title={label}>
                    <span className="inline-flex items-center gap-2">
                      <NavIcon name={icon} />
                      {!collapsed ? <span>{label}</span> : null}
                    </span>
                  </Link>
                </Button>
              );
            })}
          </div>
        ))}
      </nav>
      <Separator className="hidden lg:block" />
      <div className="mt-auto hidden p-3 lg:block">
        <Button variant="outline" size="sm" className={`w-full rounded-xl text-slate-600 ${collapsed ? "justify-center" : "justify-start"}`} asChild>
          <Link href="/" title="Storefront">
            <span className="inline-flex items-center gap-2">
              <NavIcon name="store" />
              {!collapsed ? <span>Storefront</span> : null}
            </span>
          </Link>
        </Button>
      </div>
    </aside>
  );
}
