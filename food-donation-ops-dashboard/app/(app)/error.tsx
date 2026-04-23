"use client";

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-slate-600">{error.message}</p>
    </div>
  );
}
