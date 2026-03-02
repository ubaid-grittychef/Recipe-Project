"use client";

/**
 * Polls `/api/projects/[id]/logs` every 2 seconds and shows a live progress
 * card when a generation run is currently active (status === "running").
 * Automatically disappears when the run finishes.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { GenerationLog } from "@/lib/types";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";

interface Props {
  projectId: string;
  /** Called when an active run transitions to completed/failed */
  onComplete?: () => void;
}

export default function GenerationProgressCard({ projectId, onComplete }: Props) {
  const [activeLog, setActiveLog] = useState<GenerationLog | null>(null);
  const [justFinished, setJustFinished] = useState<GenerationLog | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled) return;
      try {
        const logs = await api.get<GenerationLog[]>(`/api/projects/${projectId}/logs`);
        if (cancelled) return;

        const running = logs.find((l) => l.status === "running") ?? null;
        const mostRecent = logs[0] ?? null;

        setActiveLog(running);

        // Surface the last completed/failed run for a brief moment
        if (!running && mostRecent && (mostRecent.status === "completed" || mostRecent.status === "failed")) {
          setJustFinished((prev) => {
            if (!prev || prev.id !== mostRecent.id) {
              onComplete?.();
              return mostRecent;
            }
            return prev;
          });
          // Clear the "just finished" banner after 8 seconds
          setTimeout(() => setJustFinished((prev) => (prev?.id === mostRecent.id ? null : prev)), 8000);
        }
      } catch {
        // Non-critical — silently ignore polling errors
      }

      if (!cancelled) {
        timer = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [projectId, onComplete]);

  if (!activeLog && !justFinished) return null;

  const log = activeLog ?? justFinished!;
  const isRunning = log.status === "running";
  const isCompleted = log.status === "completed";

  return (
    <div
      className={`mb-6 rounded-xl border p-4 ${
        isRunning
          ? "border-blue-200 bg-blue-50"
          : isCompleted
          ? "border-emerald-200 bg-emerald-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-center gap-3">
        {isRunning ? (
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              isRunning ? "text-blue-900" : isCompleted ? "text-emerald-900" : "text-red-900"
            }`}
          >
            {isRunning
              ? "Generation in progress..."
              : isCompleted
              ? "Generation complete"
              : "Generation finished with errors"}
          </p>
          <p
            className={`mt-0.5 text-xs ${
              isRunning ? "text-blue-700" : isCompleted ? "text-emerald-700" : "text-red-700"
            }`}
          >
            <span className="font-medium">{log.keywords_processed}</span> processed &nbsp;·&nbsp;
            <span className="font-medium text-emerald-600">{log.keywords_succeeded}</span> succeeded &nbsp;·&nbsp;
            <span className="font-medium text-red-500">{log.keywords_failed}</span> failed
          </p>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Zap className="h-3 w-3" />
            Live
          </div>
        )}
      </div>

      {isRunning && log.keywords_processed > 0 && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  ((log.keywords_succeeded + log.keywords_failed) /
                    Math.max(log.keywords_processed, 1)) *
                    100
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
