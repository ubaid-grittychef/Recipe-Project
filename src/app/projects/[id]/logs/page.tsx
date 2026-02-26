"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { GenerationLog } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

const statusConfig = {
  running: {
    label: "Running",
    color: "bg-blue-100 text-blue-700",
    icon: Loader2,
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-100 text-emerald-700",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

export default function GenerationLogsPage({ params }: Props) {
  const { id } = use(params);
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<GenerationLog[]>(`/api/projects/${id}/logs`)
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("[GenerationLogs] fetch failed:", err);
        toast.error("Failed to load generation logs");
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Generation Logs</h1>
        <p className="mt-1 text-sm text-slate-500">
          History of all automated and manual generation runs
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
            <Activity className="h-8 w-8 text-brand-500" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-slate-900">
            No generation runs yet
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-slate-500">
            Logs will appear here after the first automated or manual generation run.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const config = statusConfig[log.status];
            const StatusIcon = config.icon;
            const duration =
              log.completed_at && log.started_at
                ? Math.round(
                    (new Date(log.completed_at).getTime() -
                      new Date(log.started_at).getTime()) /
                      1000
                  )
                : null;

            return (
              <div
                key={log.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon
                      className={cn(
                        "h-5 w-5",
                        log.status === "running" && "animate-spin text-blue-500",
                        log.status === "completed" && "text-emerald-500",
                        log.status === "failed" && "text-red-500"
                      )}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            config.color
                          )}
                        >
                          {config.label}
                        </span>
                        {duration !== null && (
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            {duration}s
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        Started: {formatDate(log.started_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6 text-center">
                    <div>
                      <p className="text-lg font-bold text-slate-900">
                        {log.keywords_processed}
                      </p>
                      <p className="text-[11px] text-slate-400">Processed</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-emerald-600">
                        {log.keywords_succeeded}
                      </p>
                      <p className="text-[11px] text-slate-400">Succeeded</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-500">
                        {log.keywords_failed}
                      </p>
                      <p className="text-[11px] text-slate-400">Failed</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
