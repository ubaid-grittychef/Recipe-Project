"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ListChecks,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { BuiltInKeyword } from "@/lib/types";

type Counts = { pending: number; done: number; failed: number };
type Filter = "all" | "pending" | "done" | "failed";

export default function QueuePage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [keywords, setKeywords] = useState<BuiltInKeyword[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, done: 0, failed: 0 });
  const [filter, setFilter] = useState<Filter>("all");
  const [pasteText, setPasteText] = useState("");
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/queue${filter !== "all" ? `?status=${filter}` : ""}`
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setKeywords(data.keywords);
      setCounts(data.counts);
    } catch {
      toast.error("Failed to load keyword queue");
    } finally {
      setLoading(false);
    }
  }, [projectId, filter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Parse preview count from paste text
  const parsedCount = pasteText
    .split("\n")
    .filter((l) => l.trim().length > 0).length;

  async function handleAdd() {
    if (!pasteText.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add");
      toast.success(`Added ${data.added} keyword${data.added !== 1 ? "s" : ""} to queue`);
      setPasteText("");
      fetchQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add keywords");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(kwId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/queue/${kwId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setKeywords((prev) => prev.filter((k) => k.id !== kwId));
      setCounts((prev) => {
        const kw = keywords.find((k) => k.id === kwId);
        if (!kw) return prev;
        return { ...prev, [kw.status]: Math.max(0, prev[kw.status] - 1) };
      });
    } catch {
      toast.error("Failed to delete keyword");
    }
  }

  async function handleResetFailed() {
    try {
      const res = await fetch(`/api/projects/${projectId}/queue/reset-failed`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to reset");
      toast.success(`Reset ${data.reset} failed keyword${data.reset !== 1 ? "s" : ""} to pending`);
      fetchQueue();
    } catch {
      toast.error("Failed to reset failed keywords");
    }
  }

  async function handleClearDone() {
    try {
      const res = await fetch(`/api/projects/${projectId}/queue?status=done`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear");
      toast.success("Cleared all done keywords");
      fetchQueue();
    } catch {
      toast.error("Failed to clear done keywords");
    }
  }

  async function handleClearPending() {
    if (!confirm("Clear all pending keywords? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/queue?status=pending`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to clear");
      toast.success("Cleared all pending keywords");
      fetchQueue();
    } catch {
      toast.error("Failed to clear pending keywords");
    }
  }

  const total = counts.pending + counts.done + counts.failed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <ListChecks className="h-6 w-6 text-brand-500" />
            Keyword Queue
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Keywords are processed in order when you run generation.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-700">
            {counts.pending} pending
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 font-medium text-green-700">
            {counts.done} done
          </span>
          {counts.failed > 0 && (
            <span className="rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">
              {counts.failed} failed
            </span>
          )}
        </div>
      </div>

      {/* Add keywords */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Add Keywords</h2>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={6}
          placeholder={`Paste keywords here — one per line.\nTo include a restaurant, use:\n  Big Mac copycat, McDonald's\n  KFC Original Chicken | KFC`}
          className="w-full rounded-lg border border-slate-200 p-3 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-y"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            {parsedCount > 0 ? (
              <span className="font-medium text-slate-700">{parsedCount} keyword{parsedCount !== 1 ? "s" : ""}</span>
            ) : (
              "Paste keywords above"
            )}{" "}
            {parsedCount > 0 && "parsed"}
          </span>
          <button
            onClick={handleAdd}
            disabled={adding || parsedCount === 0}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add to Queue
          </button>
        </div>
      </div>

      {/* Queue table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Filters + actions toolbar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex gap-1">
            {(["all", "pending", "done", "failed"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {f === "all" ? `All (${total})` : f === "pending" ? `Pending (${counts.pending})` : f === "done" ? `Done (${counts.done})` : `Failed (${counts.failed})`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {counts.failed > 0 && (
              <button
                onClick={handleResetFailed}
                className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
              >
                <RefreshCw className="h-3 w-3" />
                Reset Failed
              </button>
            )}
            {counts.done > 0 && (
              <button
                onClick={handleClearDone}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Clear Done
              </button>
            )}
            {counts.pending > 0 && (
              <button
                onClick={handleClearPending}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                Clear Pending
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : keywords.length === 0 ? (
          <div className="py-12 text-center">
            <ListChecks className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              {filter === "all"
                ? "No keywords yet. Paste some above to get started."
                : `No ${filter} keywords.`}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                <th className="px-5 py-3">Keyword</th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {keywords.map((kw) => (
                <tr key={kw.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-800">{kw.keyword}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {kw.restaurant_name ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={kw.status} />
                    {kw.error_reason && (
                      <p className="mt-1 text-xs text-red-500 max-w-xs truncate" title={kw.error_reason}>
                        {kw.error_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(kw.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(kw.id)}
                      className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BuiltInKeyword["status"] }) {
  if (status === "done") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle2 className="h-3 w-3" />
        done
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" />
        failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" />
      pending
    </span>
  );
}
