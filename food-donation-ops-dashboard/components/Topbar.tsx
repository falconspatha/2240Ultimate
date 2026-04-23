"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/browser";

export default function Topbar() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div className="text-sm text-slate-500">Food Donation / Ops Dashboard</div>
      <button onClick={handleSignOut} className="btn btn-ghost">
        Sign out
      </button>
    </div>
  );
}
