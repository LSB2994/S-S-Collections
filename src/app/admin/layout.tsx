import { cookies } from "next/headers";
import { AdminLayoutInner } from "@/components/admin/AdminLayoutInner";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("admin_sidebar_collapsed")?.value === "1";
  return <AdminLayoutInner initialCollapsed={initialCollapsed}>{children}</AdminLayoutInner>;
}
