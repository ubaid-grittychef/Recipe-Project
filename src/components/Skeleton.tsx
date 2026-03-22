/**
 * Skeleton UI primitives — replaces full-page spinners with content-shaped placeholders.
 * All pulse with a subtle animation to indicate loading.
 */

import { cn } from "@/lib/utils";

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded bg-muted", className)} />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl border border-border/50 bg-muted/50 p-5", className)}>
      <SkeletonLine className="mb-3 h-3 w-1/3" />
      <SkeletonLine className="h-7 w-1/2" />
    </div>
  );
}

/** Mimics a table row */
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
  const widths = ["w-2/5", "w-1/4", "w-1/6", "w-1/6", "w-1/5"];
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className={cn("animate-pulse rounded bg-muted h-3", widths[i % widths.length])} />
        </td>
      ))}
    </tr>
  );
}

/** A table with N placeholder rows */
export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <table className="min-w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A grid of project card skeletons */
export function SkeletonProjectGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted" />
            <div className="flex-1">
              <SkeletonLine className="mb-2 h-4 w-1/2" />
              <SkeletonLine className="h-3 w-1/3" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <SkeletonLine className="h-8 rounded-lg" />
            <SkeletonLine className="h-8 rounded-lg" />
            <SkeletonLine className="h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mimics the project detail page stats + cards */
export function SkeletonProjectDetail() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-muted" />
          <div>
            <SkeletonLine className="mb-2 h-6 w-48" />
            <SkeletonLine className="h-3 w-28" />
          </div>
        </div>
        <div className="flex gap-2">
          <SkeletonLine className="h-9 w-28 rounded-lg" />
          <SkeletonLine className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      {/* Deployment banner */}
      <SkeletonLine className="mb-6 h-16 rounded-xl" />
      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      {/* Time cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => <SkeletonLine key={i} className="h-28 rounded-xl" />)}
      </div>
    </div>
  );
}

/** Mimics a full-page list of recipe rows */
export function SkeletonRecipeList({ rows = 8 }: { rows?: number }) {
  return (
    <div>
      <SkeletonLine className="mb-6 h-4 w-24" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <SkeletonLine className="mb-2 h-7 w-32" />
          <SkeletonLine className="h-3 w-20" />
        </div>
        <SkeletonLine className="h-9 w-36 rounded-lg" />
      </div>
      <div className="mb-4 flex gap-3">
        <SkeletonLine className="h-9 w-64 rounded-lg" />
      </div>
      <SkeletonTable rows={rows} cols={5} />
    </div>
  );
}

/** Mimics the generation logs list */
export function SkeletonLogsList({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      <SkeletonLine className="mb-6 h-4 w-24" />
      <div className="mb-6">
        <SkeletonLine className="mb-2 h-7 w-40" />
        <SkeletonLine className="h-3 w-56" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <SkeletonLine className="h-5 w-5 rounded-full" />
                <div>
                  <SkeletonLine className="mb-2 h-5 w-24 rounded-full" />
                  <SkeletonLine className="h-3 w-40" />
                </div>
              </div>
              <div className="flex gap-6">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="text-center">
                    <SkeletonLine className="mb-1 h-6 w-8" />
                    <SkeletonLine className="h-2.5 w-14" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mimics the deploy page */
export function SkeletonDeployPage() {
  return (
    <div className="animate-pulse">
      <SkeletonLine className="mb-6 h-4 w-24" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <SkeletonLine className="mb-2 h-7 w-40" />
          <SkeletonLine className="h-3 w-56" />
        </div>
        <SkeletonLine className="h-9 w-32 rounded-lg" />
      </div>
      <SkeletonLine className="mb-4 h-28 rounded-xl" />
      <SkeletonLine className="mb-4 h-20 rounded-xl" />
      <div className="space-y-3">
        {[1, 2].map((i) => <SkeletonLine key={i} className="h-24 rounded-xl" />)}
      </div>
    </div>
  );
}

/** Mimics the settings page accordion */
export function SkeletonSettingsPage() {
  return (
    <div className="animate-pulse">
      <SkeletonLine className="mb-6 h-4 w-24" />
      <div className="mb-6">
        <SkeletonLine className="mb-2 h-7 w-40" />
        <SkeletonLine className="h-3 w-32" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonLine className="h-4 w-4 rounded" />
                <SkeletonLine className="h-4 w-28" />
              </div>
              <SkeletonLine className="h-4 w-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Mimics the keywords table */
export function SkeletonKeywordsPage() {
  return (
    <div>
      <SkeletonLine className="mb-6 h-4 w-24" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <SkeletonLine className="mb-2 h-7 w-32" />
          <SkeletonLine className="h-3 w-48" />
        </div>
        <SkeletonLine className="h-9 w-32 rounded-lg" />
      </div>
      <div className="mb-4 flex gap-2">
        {[1, 2, 3, 4].map((i) => <SkeletonLine key={i} className="h-7 w-20 rounded-full" />)}
      </div>
      <SkeletonTable rows={10} cols={4} />
    </div>
  );
}

/** Mimics the recipe editor form */
export function SkeletonRecipeEditor() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      <SkeletonLine className="mb-6 h-4 w-24" />
      <div className="mb-6 flex justify-between">
        <div>
          <SkeletonLine className="mb-2 h-7 w-40" />
          <SkeletonLine className="h-3 w-24" />
        </div>
        <div className="flex gap-2">
          <SkeletonLine className="h-9 w-20 rounded-lg" />
          <SkeletonLine className="h-9 w-28 rounded-lg" />
        </div>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="mb-4 rounded-xl border border-border/50 p-5">
          <SkeletonLine className="mb-4 h-4 w-32" />
          <SkeletonLine className="mb-2 h-10 rounded-lg" />
          <SkeletonLine className="h-10 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
