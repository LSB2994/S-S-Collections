import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function AdminPageHeader({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 space-y-4 pb-5">
      <div className="rounded-2xl border border-slate-200/90 bg-white/96 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {description ? <p className="max-w-3xl text-sm leading-relaxed text-slate-600">{description}</p> : null}
          </div>
          {children ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
          ) : null}
        </div>
      </div>
      <div className="px-1">
        <Separator />
      </div>
    </header>
  );
}

export function AdminSecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={href}>{children}</Link>
    </Button>
  );
}
