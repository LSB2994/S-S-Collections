"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const groups: {
  title: string;
  links: { href: string; label: string }[];
}[] = [
  {
    title: "Overview",
    links: [{ href: "/admin", label: "Dashboard" }]
  },
  {
    title: "Telegram shop",
    links: [
      { href: "/admin/telegram-categories", label: "Categories" },
      { href: "/admin/telegram-products", label: "Products & sizes" },
      { href: "/admin/telegram-promotions", label: "Discount codes" }
    ]
  }
];

function linkActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-card lg:w-60 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 lg:flex-col lg:items-stretch lg:p-4">
        <div>
          <Link href="/admin" className="font-semibold tracking-tight text-foreground">
            Shop admin
          </Link>
          <p className="mt-0.5 hidden text-xs text-muted-foreground lg:block">Telegram catalog</p>
        </div>
        <Button variant="outline" size="sm" className="lg:hidden" asChild>
          <Link href="/">Store</Link>
        </Button>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:gap-0 lg:overflow-visible">
        {groups.map((group) => (
          <div key={group.title} className="contents lg:block lg:space-y-1 lg:pb-3">
            <p className="hidden px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground lg:block">
              {group.title}
            </p>
            {group.links.map(({ href, label }) => {
              const active = linkActive(pathname, href);
              return (
                <Button
                  key={href}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  className="justify-start gap-2 whitespace-nowrap lg:w-full lg:whitespace-normal"
                  asChild
                >
                  <Link href={href} title={label}>
                    {label}
                  </Link>
                </Button>
              );
            })}
          </div>
        ))}
      </nav>
      <Separator className="hidden lg:block" />
      <div className="mt-auto hidden p-2 lg:block">
        <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" asChild>
          <Link href="/">Storefront</Link>
        </Button>
      </div>
    </aside>
  );
}
