"use client";

/**
 * Polls `/api/projects/[id]/logs` every 2 seconds and shows a live progress
 * card when a generation run is currently active (status === "running").
 * Also polls `/api/projects/[id]/keywords` to surface a live per-keyword feed.
 * Automatically disappears when the run finishes.
 */

import { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api-client";
import { GenerationLog, KeywordLog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, Zap, ChevronDown, ChevronUp, DollarSign } from "lucide-react";

/** Rough cost estimate based on GPT-4o-mini pricing (~$0.15/1M input, ~$0.60/1M output) */
function estimateCost(succeeded: number): string {
  if (succeeded <= 0) return "$0.00";
  // ~1500 input tokens + ~3000 output tokens per recipe
  const costUsd = succeeded * (1500 * 0.15 / 1_000_000 + 3000 * 0.60 / 1_000_000);
  if (costUsd < 0.01) return "< $0.01";
  return `~$${costUsd.toFixed(2)}`;
}

interface Props {
  projectId: string;
  /** Called when an active run transitions to completed/failed */
  onComplete?: () => void;
  /** Called whenever the running state changes */
  onRunningChange?: (isRunning: boolean) => void;
}

export default function GenerationProgressCard({ projectId, onComplete, onRunningChange }: Props) {
  const [activeLog, setActiveLog] = useState<GenerationLog | null>(null);
  const [justFinished, setJustFinished] = useState<GenerationLog | null>(null);
  const [recentKeywords, setRecentKeywords] = useState<KeywordLog[]>([]);
  const [expanded, setExpanded] = useState(false);
  // Track the keyword log count at run start so we only show new ones
  const runStartCountRef = useRef(0);
  // Track logs that have been shown and dismissed so they don't reappear
  const dismissedLogIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled) return;
      try {
        const [logs, kwLogs] = await Promise.all([
          api.get<GenerationLog[]>(`/api/projects/${projectId}/logs`),
          api.get<KeywordLog[]>(`/api/projects/${projectId}/keywords`),
        ]);
        if (cancelled) return;

        const running = logs.find((l) => l.status === "running") ?? null;
        const mostRecent = logs[0] ?? null;

        // Capture how many kw logs existed before this run started
        if (running && runStartCountRef.current === 0) {
          runStartCountRef.current = 0; // reset will be handled by run-start detection below
        }

        setActiveLog((prev) => {
          // Detect new run starting
          if (!prev && running) runStartCountRef.current = kwLogs.length - (running.keywords_processed ?? 0);
          return running;
        });

        // Show only keywords processed in THIS run (newest first)
        if (running || mostRecent) {
          const runStart = runStartCountRef.current;
          const newKws = [...kwLogs.slice(runStart)].reverse();
          setRecentKeywords(newKws.slice(0, 8));
        }

        if (!running && mostRecent && (mostRecent.status === "completed" || mostRecent.status === "failed")) {
          if (mostRecent.id !== dismissedLogIdRef.current) {
            setJustFinished((prev) => {
              if (!prev || prev.id !== mostRecent.id) {
                onComplete?.();
                // Show all keywords from the finished run (newest first)
                const runStart = runStartCountRef.current;
                const newKws = [...kwLogs.slice(runStart)].reverse();
                setRecentKeywords(newKws.slice(0, 8));
                runStartCountRef.current = 0;
                return mostRecent;
              }
              return prev;
            });
            setTimeout(() => {
              dismissedLogIdRef.current = mostRecent.id;
              setJustFinished((prev) => (prev?.id === mostRecent.id ? null : prev));
            }, 10000);
          }
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
  }, [projectId, onComplete, onRunningChange]);

  // Notify parent of running state changes — must be outside the poll loop
  // to avoid calling setState on a different component during render.
  useEffect(() => {
    onRunningChange?.(activeLog !== null);
  }, [activeLog, onRunningChange]);

  if (!activeLog && !justFinished) return null;

  const log = activeLog ?? justFinished!;
  const isRunning = log.status === "running";
  const isCompleted = log.status === "completed";

  return (
    <div className={cn(
      "mb-6 overflow-hidden rounded-xl border",
      isRunning ? "border-blue-200 bg-blue-50" : isCompleted ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
    )}>
      <div className="flex items-center gap-3 p-4">
        {isRunning ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
        ) : isCompleted ? (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
        ) : (
          <XCircle className="h-5 w-5 shrink-0 text-red-500" />
        )}
        <div className="flex-1">
          <p className={cn(
            "text-sm font-medium",
            isRunning ? "text-blue-900" : isCompleted ? "text-emerald-900" : "text-red-900"
          )}>
            {isRunning ? "Generation in progress..." : isCompleted ? "Generation complete" : "Generation finished with errors"}
          </p>
          <p className={cn(
            "mt-0.5 text-xs",
            isRunning ? "text-blue-700" : isCompleted ? "text-emerald-700" : "text-red-700"
          )}>
            <span className="font-medium">{log.keywords_processed}</span> processed &nbsp;·&nbsp;
            <span className="font-medium text-emerald-600">{log.keywords_succeeded}</span> succeeded &nbsp;·&nbsp;
            <span className="font-medium text-red-500">{log.keywords_failed}</span> failed
            {!isRunning && log.keywords_succeeded > 0 && (
              <span className="ml-2 inline-flex items-center gap-0.5 text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                {estimateCost(log.keywords_succeeded)} est. cost
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <div className="flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
              <Zap className="h-3 w-3" />
              Live
            </div>
          )}
          {recentKeywords.length > 0 && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors",
                isRunning ? "text-blue-600 hover:bg-blue-100" : isCompleted ? "text-emerald-600 hover:bg-emerald-100" : "text-red-600 hover:bg-red-100"
              )}
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Hide" : "Details"}
            </button>
          )}
        </div>
      </div>

      {isRunning && log.keywords_processed > 0 && (
        <div className="px-4 pb-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${Math.min(
                  100,
                  ((log.keywords_succeeded + log.keywords_failed) /
                    Math.max(log.keywords_processed, 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      )}

      {expanded && recentKeywords.length > 0 && (
        <div className="border-t border-current/10 px-4 pb-3 pt-2">
          <p className={cn(
            "mb-2 text-xs font-medium",
            isRunning ? "text-blue-700" : isCompleted ? "text-emerald-700" : "text-red-700"
          )}>
            Recent keywords
          </p>
          <ul className="space-y-1">
            {recentKeywords.map((kw) => (
              <li key={kw.id} className="flex items-center gap-2 text-xs">
                {kw.status === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                )}
                <span className={cn(
                  "truncate",
                  isRunning ? "text-blue-800" : isCompleted ? "text-emerald-800" : "text-red-800"
                )}>
                  {kw.keyword}
                  {kw.restaurant_name ? <span className="opacity-60"> · {kw.restaurant_name}</span> : null}
                </span>
                {kw.status === "failed" && kw.error_reason && (
                  <span className="ml-auto shrink-0 text-red-400 truncate max-w-[200px]">
                    {kw.error_reason}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
