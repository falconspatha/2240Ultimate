import Link from "next/link";
import { navForRole } from "../lib/navigation";
import { getUser, getUserRole } from "../lib/auth";

export default async function Sidebar() {
  const user = await getUser();
  const role = getUserRole(user);

  const filtered = navForRole(role);

  return (
    <aside className="hidden min-h-screen w-64 border-r border-slate-200 bg-white p-4 lg:block">
      <div className="mb-6">
        <div className="text-lg font-semibold">Food Donation Ops</div>
        <div className="text-xs text-slate-500">{user?.email || "Signed out"}</div>
        <div className="mt-1 text-xs text-slate-500">Role: {role}</div>
      </div>
      <nav className="flex flex-col gap-2">
        {filtered.map((item) => (
          <Link key={item.href} href={item.href} className="btn btn-ghost justify-start">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
