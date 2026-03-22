"use client";

import { useState } from "react";
import { Zap, Calendar, Clock, ChevronDown, ChevronUp, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { Project } from "@/lib/types";

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
];

function formatNextRun(time: string, days: number[], perDay: number): string {
  const [h, m] = time.split(":").map(Number);
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const c = new Date(now);
    c.setDate(now.getDate() + i);
    c.setHours(h, m, 0, 0);
    const isoDay = c.getDay() === 0 ? 7 : c.getDay();
    if (days.includes(isoDay) && c > now) {
      const isToday = c.toDateString() === now.toDateString();
      const isTomorrow =
        c.toDateString() === new Date(now.getTime() + 86400000).toDateString();
      const dayName = c.toLocaleDateString("en-US", { weekday: "long" });
      const timeStr = c.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      const prefix = isToday ? "Today" : isTomorrow ? "Tomorrow" : dayName;
      return `Next: ${prefix} at ${timeStr} (${perDay} recipe${perDay !== 1 ? "s" : ""})`;
    }
  }
  return "No upcoming runs — check your day selection";
}

interface Props {
  project: Project;
  draftCount: number;
  onPublished: () => void;
}

export function PublishSchedulePanel({ project, draftCount, onPublished }: Props) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [enabled, setEnabled] = useState(project.publish_schedule_enabled ?? false);
  const [time, setTime] = useState(project.publish_time ?? "09:00");
  const [perDay, setPerDay] = useState(project.publish_per_day ?? 3);
  const [days, setDays] = useState<number[]>(() => {
    try {
      return JSON.parse(project.publish_days ?? "[1,2,3,4,5]");
    } catch {
      return [1, 2, 3, 4, 5];
    }
  });
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    );
  }

  async function handlePublishNow(count?: number) {
    if (draftCount === 0) return;
    setPublishing(true);
    try {
      const body: Record<string, unknown> = {};
      if (count !== undefined) body.count = count;
      const data = await api.post<{ published: number }>(
        `/api/projects/${project.id}/recipes/bulk-publish`,
        body
      );
      toast.success(
        `Published ${data.published} recipe${data.published !== 1 ? "s" : ""}`
      );
      onPublished();
    } catch {
      toast.error("Failed to publish recipes");
    } finally {
      setPublishing(false);
    }
  }

  async function handleSaveSchedule() {
    setSaving(true);
    try {
      await api.put(`/api/projects/${project.id}`, {
        publish_schedule_enabled: enabled,
        publish_time: time,
        publish_per_day: perDay,
        publish_days: JSON.stringify(days),
      });
      toast.success("Publish schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Publish Queue</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {draftCount > 0
            ? `${draftCount} recipe${draftCount !== 1 ? "s" : ""} ready to publish`
            : "No draft recipes"}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handlePublishNow()}
          disabled={publishing || draftCount === 0}
          className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <Zap className="w-4 h-4" />
          {publishing ? "Publishing…" : "Publish All Now"}
        </button>
        {draftCount > 0 && draftCount > perDay && (
          <button
            onClick={() => handlePublishNow(perDay)}
            disabled={publishing}
            className="flex items-center gap-2 px-4 py-2 border border-border text-foreground rounded-lg text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            Publish {perDay} Now
          </button>
        )}
      </div>

      {/* Schedule toggle row */}
      <div className="border-t border-border/50 pt-3">
        <button
          onClick={() => setScheduleOpen((v) => !v)}
          className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            Auto-publish schedule
            {enabled && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wide">
                Active
              </span>
            )}
          </span>
          {scheduleOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {scheduleOpen && (
          <div className="mt-4 space-y-4">
            {/* Enable toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-300"
              />
              <span className="text-sm text-foreground">Enable scheduled publishing</span>
            </label>

            {enabled && (
              <>
                {/* Time picker */}
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <label className="text-sm text-muted-foreground w-28 shrink-0">Publish at</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                {/* Quantity stepper */}
                <div className="flex items-center gap-3">
                  <span className="w-4 shrink-0" />
                  <label className="text-sm text-muted-foreground w-28 shrink-0">Recipes / run</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPerDay((v) => Math.max(1, v - 1))}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-accent text-base leading-none"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-foreground">
                      {perDay}
                    </span>
                    <button
                      onClick={() => setPerDay((v) => Math.min(20, v + 1))}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-accent text-base leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Day chips */}
                <div className="flex items-center gap-3">
                  <span className="w-4 shrink-0" />
                  <label className="text-sm text-muted-foreground w-28 shrink-0">Days</label>
                  <div className="flex gap-1 flex-wrap">
                    {DAYS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => toggleDay(d.value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                          days.includes(d.value)
                            ? "bg-brand-500 text-white border-brand-500"
                            : "bg-card text-muted-foreground border-border hover:bg-accent"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Next run preview */}
                {days.length > 0 && (
                  <p className="text-xs text-muted-foreground pl-[calc(1rem+0.75rem+7rem+0.75rem)]">
                    {formatNextRun(time, days, perDay)}
                  </p>
                )}

                {/* SEO tip */}
                <div className="flex gap-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-400">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <strong>SEO tip:</strong> Publishing 1–3 recipes per day at a consistent
                    time signals fresh content to Google. Daily weekday publishing is the most
                    effective strategy for building search authority.
                  </span>
                </div>
              </>
            )}

            {/* Save button */}
            <button
              onClick={handleSaveSchedule}
              disabled={saving}
              className="w-full py-2 bg-foreground text-white rounded-lg text-sm font-medium hover:bg-foreground/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Saving…" : "Save Schedule"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
