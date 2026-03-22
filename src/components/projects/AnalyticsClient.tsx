"use client";

import { useState } from "react";
import { GenerationLog, KeywordLog, Recipe } from "@/lib/types";
import { CheckCircle2, XCircle, Loader2, Clock, TrendingUp, Image as ImageIcon, FileText, Star, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface Props {
  genLogs: GenerationLog[];
  kwLogs: KeywordLog[];
  recipes: Recipe[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

const RANGE_OPTIONS = [
  { label: "4 weeks", value: 4 },
  { label: "8 weeks", value: 8 },
  { label: "12 weeks", value: 12 },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function AnalyticsClient({ genLogs, kwLogs, recipes }: Props) {
  const [weekRange, setWeekRange] = useState(8);
  const totalRecipes = recipes.length;

  // Content quality metrics
  const pctWithImages = totalRecipes > 0
    ? Math.round((recipes.filter((r) => !!r.image_url).length / totalRecipes) * 100)
    : 0;
  const avgWordCount = totalRecipes > 0
    ? Math.round(recipes.reduce((s, r) => s + (r.word_count || 0), 0) / totalRecipes)
    : 0;
  const pctWithFAQs = totalRecipes > 0
    ? Math.round((recipes.filter((r) => r.faqs && r.faqs.length > 0).length / totalRecipes) * 100)
    : 0;
  const pctHighRating = totalRecipes > 0
    ? Math.round((recipes.filter((r) => r.rating >= 4.5).length / totalRecipes) * 100)
    : 0;

  // Generation history — last N weeks
  const now = new Date();
  const weeks: { label: string; key: string; Succeeded: number; Failed: number }[] = [];
  for (let i = weekRange - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = getISOWeek(d);
    const weekNum = key.split("-W")[1];
    weeks.push({ label: `W${weekNum}`, key, Succeeded: 0, Failed: 0 });
  }
  for (const log of genLogs) {
    const key = getISOWeek(new Date(log.started_at));
    const week = weeks.find((w) => w.key === key);
    if (week) {
      week.Succeeded += log.keywords_succeeded ?? 0;
      week.Failed += log.keywords_failed ?? 0;
    }
  }
  const hasBarData = weeks.some((w) => w.Succeeded + w.Failed > 0);

  // Category distribution — top 8
  const catCounts: Record<string, number> = {};
  for (const r of recipes) {
    if (r.category) catCounts[r.category] = (catCounts[r.category] || 0) + 1;
  }
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const maxCatCount = Math.max(...topCategories.map(([, c]) => c), 1);

  // Keyword success rate
  const totalKwDone = kwLogs.filter((k) => k.status === "done").length;
  const totalKwFailed = kwLogs.filter((k) => k.status === "failed").length;
  const totalKwAttempted = totalKwDone + totalKwFailed;
  const successPct = totalKwAttempted > 0 ? Math.round((totalKwDone / totalKwAttempted) * 100) : 0;

  const pieData = [
    { name: "Succeeded", value: totalKwDone },
    { name: "Failed", value: totalKwFailed },
  ];
  const PIE_COLORS = ["#10b981", "#ef4444"];

  // Generation run history — last 10
  const recentRuns = [...genLogs]
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 10);

  return (
    <div className="space-y-6">

      {/* Row 1: Generation History + Keyword Success */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Generation History Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Generation History</h2>
              <p className="text-xs text-muted-foreground">Recipes generated per week</p>
            </div>
            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setWeekRange(opt.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    weekRange === opt.value
                      ? "bg-brand-500 text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {!hasBarData ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No generation runs yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeks} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="Succeeded" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Failed" stackId="a" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Keyword Success Pie Chart */}
        <div className="rounded-xl border border-border bg-card p-6 flex flex-col">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Keyword Success Rate</h2>
          <p className="mb-4 text-xs text-muted-foreground">{totalKwAttempted} keywords attempted</p>
          {totalKwAttempted === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No data yet
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <PieChart width={160} height={160}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-bold text-foreground">{successPct}%</span>
                  <span className="text-[11px] text-muted-foreground">success</span>
                </div>
              </div>
              <div className="flex gap-5 text-sm">
                <div className="text-center">
                  <p className="font-bold text-emerald-600">{totalKwDone}</p>
                  <p className="text-xs text-muted-foreground">Succeeded</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-red-500">{totalKwFailed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Content Quality Metrics */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Content Quality</h2>
        <p className="mb-5 text-xs text-muted-foreground">Across {totalRecipes} recipe{totalRecipes !== 1 ? "s" : ""}</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "With Images", value: `${pctWithImages}%`, sub: `${recipes.filter((r) => !!r.image_url).length} of ${totalRecipes}`, icon: ImageIcon, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/50" },
            { label: "Avg Word Count", value: avgWordCount.toLocaleString(), sub: "words per recipe", icon: FileText, color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-950/50" },
            { label: "With FAQs", value: `${pctWithFAQs}%`, sub: `${recipes.filter((r) => r.faqs && r.faqs.length > 0).length} of ${totalRecipes}`, icon: HelpCircle, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/50" },
            { label: "High Rating (≥4.5)", value: `${pctHighRating}%`, sub: `${recipes.filter((r) => r.rating >= 4.5).length} of ${totalRecipes}`, icon: Star, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/50" },
          ].map((m) => (
            <div key={m.label} className="rounded-xl border border-border/50 bg-muted/50 p-4">
              <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg", m.bg)}>
                <m.icon className={cn("h-4 w-4", m.color)} />
              </div>
              <p className="text-2xl font-bold text-foreground">{m.value}</p>
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">{m.label}</p>
              <p className="text-[11px] text-muted-foreground">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Category Distribution */}
      {topCategories.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold text-foreground">Category Distribution</h2>
          <p className="mb-5 text-xs text-muted-foreground">Top {topCategories.length} categories by recipe count</p>
          <div className="space-y-3">
            {topCategories.map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <span className="w-32 truncate text-xs text-muted-foreground">{name}</span>
                <div className="flex-1 rounded-full bg-secondary h-2.5">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${(count / maxCatCount) * 100}%` }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-semibold text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 4: Generation Run History */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border/50 px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">Recent Generation Runs</h2>
          <p className="text-xs text-muted-foreground">Last {recentRuns.length} runs</p>
        </div>
        {recentRuns.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">No generation runs yet</div>
        ) : (
          <div className="divide-y divide-border/50">
            <div className="grid grid-cols-6 gap-4 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="col-span-2">Date</span>
              <span className="text-center">Processed</span>
              <span className="text-center">Succeeded</span>
              <span className="text-center">Failed</span>
              <span className="text-center">Status</span>
            </div>
            {recentRuns.map((log) => {
              const duration = log.completed_at && log.started_at
                ? Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)
                : null;
              const statusConfig = {
                running: { label: "Running", cls: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400", Icon: Loader2 },
                completed: { label: "Done", cls: "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400", Icon: CheckCircle2 },
                failed: { label: "Failed", cls: "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400", Icon: XCircle },
              }[log.status];
              const StatusIcon = statusConfig.Icon;
              return (
                <div key={log.id} className="grid grid-cols-6 gap-4 px-6 py-3 text-sm items-center hover:bg-accent">
                  <div className="col-span-2">
                    <p className="font-medium text-foreground">{relativeTime(log.started_at)}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {duration !== null && <><Clock className="h-3 w-3" />{duration}s</>}
                    </p>
                  </div>
                  <p className="text-center font-semibold text-foreground">{log.keywords_processed}</p>
                  <p className="text-center font-semibold text-emerald-600">{log.keywords_succeeded}</p>
                  <p className="text-center font-semibold text-red-500">{log.keywords_failed}</p>
                  <div className="flex justify-center">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", statusConfig.cls)}>
                      <StatusIcon className={cn("h-3 w-3", log.status === "running" && "animate-spin")} />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total word count footer */}
      {totalRecipes > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/50">
                <TrendingUp className="h-4 w-4 text-brand-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Total Content Output</p>
                <p className="text-xs text-muted-foreground">Across all published and draft recipes</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
                {(recipes.reduce((s, r) => s + (r.word_count || 0), 0) / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-muted-foreground">total words</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
