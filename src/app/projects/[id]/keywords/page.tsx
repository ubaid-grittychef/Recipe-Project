"use client";

import { useEffect, useState, use, useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { KeywordLog, KeywordStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  KeyRound,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { SkeletonKeywordsPage } from "@/components/Skeleton";

interface Props {
  params: Promise<{ id: string }>;
}

type StatusFilter = "all" | KeywordStatus;

const PAGE_SIZE = 100;

export default function KeywordsPage({ params }: Props) {
  const { id } = use(params);
  const [logs, setLogs] = useState<KeywordLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(0);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    api.get<KeywordLog[]>(`/api/projects/${id}/keywords`)
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch(() => {
        toast.error("Failed to load keyword logs");
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const filtered = useMemo(() => {
    const base = statusFilter === "all" ? logs : logs.filter((l) => l.status === statusFilter);
    return base;
  }, [logs, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset to first page when filter changes
  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const failedCount = useMemo(() => logs.filter((l) => l.status === "failed").length, [logs]);

  async function handleRetryAll() {
    if (failedCount === 0) return;
    setRetrying(true);
    try {
      const result = await api.post<{ reset: number; message: string }>(
        `/api/projects/${id}/keywords/retry`
      );
      toast.success(result.message);
    } catch {
      toast.error("Failed to retry keywords — check Google Sheet configuration");
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return <SkeletonKeywordsPage />;
  }

  const pills: { value: StatusFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: logs.length },
    { value: "pending", label: "Pending", count: logs.filter((l) => l.status === "pending").length },
    { value: "done", label: "Done", count: logs.filter((l) => l.status === "done").length },
    { value: "failed", label: "Failed", count: failedCount },
  ];

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keyword Logs</h1>
          <p className="mt-1 text-sm text-slate-500">
            Processing status for each keyword — {logs.length.toLocaleString()} total
          </p>
        </div>
        {failedCount > 0 && (
          <button
            onClick={handleRetryAll}
            disabled={retrying}
            className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} />
            {retrying ? "Retrying..." : `Retry ${failedCount} failed`}
          </button>
        )}
      </div>

      {/* Status filter pills */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        {pills.map(({ value, label, count }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              statusFilter === value
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {label}
            <span className={cn(
              "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
              statusFilter === value ? "bg-white/20" : "bg-slate-200"
            )}>
              {count.toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filtered.length === 0 ? (
          <EmptyState hasFilter={statusFilter !== "all"} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Keyword
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Restaurant
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Error Reason
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      Processed At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginated.map((log) => (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-slate-900">
                        {log.keyword}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                        {log.restaurant_name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="max-w-xs px-6 py-4 text-sm text-slate-600">
                        <span className="line-clamp-2">
                          {log.error_reason ?? "—"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                        {formatDate(log.processed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                <p className="text-xs text-slate-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of{" "}
                  {filtered.length.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-2 text-xs text-slate-600">
                    Page {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: KeywordStatus }) {
  const config = {
    pending: {
      icon: Clock,
      className: "bg-amber-100 text-amber-700",
    },
    done: {
      icon: CheckCircle,
      className: "bg-emerald-100 text-emerald-700",
    },
    failed: {
      icon: XCircle,
      className: "bg-red-100 text-red-700",
    },
  };
  const { icon: Icon, className } = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
        <KeyRound className="h-8 w-8 text-brand-500" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-slate-900">
        {hasFilter ? "No matching logs" : "No keyword logs yet"}
      </h3>
      <p className="mt-2 max-w-sm text-center text-sm text-slate-500">
        {hasFilter
          ? "Try a different status filter or show all."
          : "Keyword processing logs will appear here once generation runs."}
      </p>
    </div>
  );
}
