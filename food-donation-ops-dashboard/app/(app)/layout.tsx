import type { ReactNode } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { requireUser } from "../../lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: ReactNode }) {
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1">
        <Topbar />
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
