"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { AdminNav } from "./AdminNav";

export function AdminLayoutInner({
  children,
  initialCollapsed = false
}: {
  children: React.ReactNode;
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  useEffect(() => {
    window.localStorage.setItem("admin_sidebar_collapsed", collapsed ? "1" : "0");
    document.cookie = `admin_sidebar_collapsed=${collapsed ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }, [collapsed]);

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#f6f6f7] lg:flex-row">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(249,115,22,0.08),transparent_42%),radial-gradient(circle_at_100%_0%,rgba(15,23,42,0.04),transparent_36%)]" />
      <AdminNav collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
      <main className="relative z-10 flex-1 overflow-auto p-4 sm:p-6 lg:p-7">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
