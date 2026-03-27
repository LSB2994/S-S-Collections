import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const cards = [
  {
    href: "/admin/telegram-categories",
    step: 1,
    title: "Categories",
    body: "Set up sections (Man / Woman / Kid) and sub-categories before you attach products."
  },
  {
    href: "/admin/telegram-products",
    step: 2,
    title: "Products & sizes",
    body: "Create products, add variants (size, price, stock), and assign each product to one or more sub-categories."
  },
  {
    href: "/admin/telegram-promotions",
    step: 3,
    title: "Discount codes",
    body: "Optional: percent or fixed amount off — used when your bot applies promos at checkout."
  }
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Manage what the Telegram bot shows from Supabase. Follow the steps below for the smoothest setup.
        </p>
      </div>

      <ol className="grid gap-4">
        {cards.map((c) => (
          <li key={c.href}>
            <Link href={c.href} className="block transition hover:opacity-95">
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <Badge variant="secondary" className="mt-0.5 shrink-0 px-2.5 py-1 text-base font-semibold tabular-nums">
                    {c.step}
                  </Badge>
                  <div className="min-w-0 space-y-1.5">
                    <CardTitle className="text-lg">{c.title}</CardTitle>
                    <CardDescription className="text-pretty">{c.body}</CardDescription>
                    <p className="flex items-center gap-1 pt-1 text-sm font-medium text-primary">
                      Open <ArrowRight className="size-4" />
                    </p>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
