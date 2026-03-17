import { SkeletonCard } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <div className="h-64 animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
        <div className="h-48 animate-pulse rounded-xl border border-slate-100 bg-slate-50" />
      </div>
    </div>
  );
}
