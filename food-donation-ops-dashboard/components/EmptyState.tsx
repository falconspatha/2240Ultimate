export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="card p-6 text-center">
      <div className="text-lg font-semibold">{title}</div>
      {description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}
    </div>
  );
}
