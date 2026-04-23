"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function Pagination({ total, pageSize }: { total: number; pageSize: number }) {
  const search = useSearchParams();
  const router = useRouter();
  const page = Number(search.get("page") || 1);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const go = (next: number) => {
    const params = new URLSearchParams(search.toString());
    params.set("page", String(next));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="mt-4 flex items-center gap-2 text-sm">
      <button className="btn btn-ghost" onClick={() => go(Math.max(1, page - 1))} disabled={page <= 1}>
        Prev
      </button>
      <span>
        Page {page} / {pages}
      </span>
      <button className="btn btn-ghost" onClick={() => go(Math.min(pages, page + 1))} disabled={page >= pages}>
        Next
      </button>
    </div>
  );
}
