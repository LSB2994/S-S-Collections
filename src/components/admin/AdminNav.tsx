"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type IconName = "dashboard" | "orders" | "categories" | "products" | "discounts" | "store";

function NavIcon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  if (name === "dashboard") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="2" />
        <rect x="13" y="3" width="8" height="5" rx="2" />
        <rect x="13" y="10" width="8" height="11" rx="2" />
        <rect x="3" y="13" width="8" height="8" rx="2" />
      </svg>
    );
  }
  if (name === "orders") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h10" />
        <rect x="3" y="4" width="18" height="16" rx="2" />
      </svg>
    );
  }
  if (name === "categories") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M4 12h12" />
        <path d="M4 17h8" />
        <circle cx="18" cy="12" r="2" />
        <circle cx="14" cy="17" r="2" />
      </svg>
    );
  }
  if (name === "products") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M4 7.5 12 3l8 4.5-8 4.5z" />
        <path d="M4 7.5V16L12 21l8-5V7.5" />
        <path d="M12 12v9" />
      </svg>
    );
  }
  if (name === "discounts") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
        <path d="M8 8h.01" />
        <path d="M16 16h.01" />
        <path d="m7 17 10-10" />
        <rect x="3" y="6" width="18" height="12" rx="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M3 7h18v13H3z" />
      <path d="M8 7a4 4 0 1 1 8 0" />
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
      { href: "/admin/telegram-users", label: "Users", icon: "categories" },
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
