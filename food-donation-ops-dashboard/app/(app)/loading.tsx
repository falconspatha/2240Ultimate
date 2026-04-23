import SkeletonTable from "../../components/SkeletonTable";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
      <SkeletonTable rows={6} cols={6} />
    </div>
  );
}
