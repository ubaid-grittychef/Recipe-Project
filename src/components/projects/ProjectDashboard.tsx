"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Project, Recipe, GenerationLog, Deployment } from "@/lib/types";
import { api, ApiError } from "@/lib/api-client";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  BookOpen,
  KeyRound,
  AlertCircle,
  Clock,
  Calendar,
  BarChart3,
  Play,
  Pause,
  Settings,
  Zap,
  ArrowLeft,
  Loader2,
  TrendingUp,
  Target,
  Rocket,
  CheckCircle2,
  Globe,
  ExternalLink,
  ChefHat,
  Activity,
  WifiOff,
  ListChecks,
  Tag,
  Circle,
  Upload,
  Map,
  Send,
  LayoutDashboard,
  FileText,
  Settings2,
} from "lucide-react";
import GenerationProgressCard from "@/components/GenerationProgressCard";
import { PublishSchedulePanel } from "@/components/projects/PublishSchedulePanel";

interface Props {
  id: string;
  project: Project;
  initialDraftCount: number;
  initialQueueCounts: { pending: number; done: number; failed: number };
  initialRecipes?: Recipe[];
}

export default function ProjectDashboard({ id, project: initialProject, initialDraftCount, initialQueueCounts, initialRecipes = [] }: Props) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [draftCount, setDraftCount] = useState(initialDraftCount);
  const [queueCounts, setQueueCounts] = useState(initialQueueCounts);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generationRunning, setGenerationRunning] = useState(false);
  const [healthCheck, setHealthCheck] = useState<{ healthy: boolean | null; latency_ms?: number } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ openai: boolean; pexels: boolean } | null>(null);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<{ pinged: boolean; sitemapUrl?: string; message: string } | null>(null);
  const [needsRedeploy, setNeedsRedeploy] = useState(false);
  const [redeploying, setRedeploying] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "content" | "operations">("overview");
  const genPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup generation poll on unmount
  useEffect(() => {
    return () => {
      if (genPollRef.current) clearInterval(genPollRef.current);
    };
  }, []);

  // Non-blocking background fetch — doesn't block initial render
  useEffect(() => {
    fetch("/api/system/config")
      .then((r) => r.json())
      .then(setConfigStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem(`needs_redeploy_${id}`)) {
      setNeedsRedeploy(true);
    }
  }, [id]);

  async function toggleStatus() {
    const newStatus = project.status === "active" ? "paused" : "active";
    // Optimistic update
    setProject((p) => ({ ...p, status: newStatus }));
    try {
      const updated = await api.put<Project>(`/api/projects/${id}`, { status: newStatus });
      setProject(updated);
    } catch {
      setProject((p) => ({ ...p, status: project.status }));
      toast.error(`Failed to ${newStatus === "active" ? "activate" : "pause"} project`);
    }
  }

  async function fetchProject() {
    const refreshed = await api.get<Project>(`/api/projects/${id}`);
    setProject(refreshed);
    setDraftCount(refreshed.draft_count ?? 0);
  }

  async function publishAllDrafts() {
    setPublishing(true);
    try {
      const result = await api.post<{ published: number; failed: number; message: string }>(
        `/api/projects/${id}/recipes/bulk-publish`
      );
      toast.success(result.message);
      const refreshed = await api.get<Project>(`/api/projects/${id}`);
      setProject(refreshed);
      setDraftCount(refreshed.draft_count ?? 0);
    } catch {
      toast.error("Publish failed — check server logs");
    } finally {
      setPublishing(false);
    }
  }

  async function checkSiteHealth() {
    setCheckingHealth(true);
    try {
      const result = await api.get<{ healthy: boolean | null; latency_ms?: number }>(
        `/api/projects/${id}/health`
      );
      setHealthCheck(result);
    } catch {
      setHealthCheck({ healthy: false });
    } finally {
      setCheckingHealth(false);
    }
  }

  async function pingSitemap() {
    setPinging(true);
    try {
      const result = await api.post<{ pinged: boolean; sitemapUrl?: string; message: string }>(
        `/api/projects/${id}/sitemap/ping`
      );
      setPingResult(result);
      toast.success(result.message);
    } catch {
      toast.error("Sitemap ping failed");
    } finally {
      setPinging(false);
    }
  }

  async function triggerGeneration() {
    setGenerating(true);
    try {
      const result = await api.post<{ message: string; warnings?: string[] }>(`/api/projects/${id}/generate`);
      if (result.warnings?.length) {
        for (const w of result.warnings) toast.warning(w);
      } else {
        toast.success("Generation started — recipes will appear shortly");
      }
      if (genPollRef.current) clearInterval(genPollRef.current);
      let attempts = 0;
      genPollRef.current = setInterval(async () => {
        attempts++;
        try {
          const [refreshed, queue] = await Promise.all([
            api.get<Project>(`/api/projects/${id}`),
            api.get<{ counts: { pending: number; done: number; failed: number } }>(`/api/projects/${id}/queue`),
          ]);
          setProject(refreshed);
          setQueueCounts(queue.counts ?? queueCounts);
          // Stop polling once generation is no longer running
          if (refreshed.generation_status !== "running") {
            clearInterval(genPollRef.current!);
            genPollRef.current = null;
          }
        } catch { /* ignore transient */ }
        if (attempts >= 45) {
          clearInterval(genPollRef.current!);
          genPollRef.current = null;
        }
      }, 4000);
    } catch (err) {
      const msg = err instanceof ApiError
        ? `Generation failed: ${(err.body as { details?: string })?.details ?? err.statusText}`
        : "Generation failed — check server logs";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function triggerRedeploy() {
    setRedeploying(true);
    try {
      await api.post(`/api/projects/${id}/deploy`);
      localStorage.removeItem(`needs_redeploy_${id}`);
      setNeedsRedeploy(false);
      toast.success("Redeployment started — your new template is being applied");
      const updated = await api.get<Project>(`/api/projects/${id}`);
      setProject(updated);
    } catch {
      toast.error("Redeploy failed — check the Deploy page for details");
    } finally {
      setRedeploying(false);
    }
  }

  const successRate =
    project.recipes_published + project.keywords_failed > 0
      ? Math.round((project.recipes_published / (project.recipes_published + project.keywords_failed)) * 100)
      : 0;

  return (
    <div>
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        All Projects
      </Link>

      {/* Project Header */}
      <div
        className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        style={{ borderLeftColor: project.primary_color || "#f97316", borderLeftWidth: "5px" }}
      >
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {project.logo_url ? (
              <img
                src={project.logo_url}
                alt={project.name}
                className="h-14 w-14 shrink-0 rounded-xl object-contain border border-slate-200 bg-white p-1"
              />
            ) : (
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white shadow-sm"
                style={{ backgroundColor: project.primary_color || "#f97316" }}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                {project.deployment_status === "deployed" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Live
                  </span>
                ) : project.status === "active" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Paused
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{project.niche}</p>
              {project.domain && (
                <p className="mt-0.5 text-xs text-slate-400">{project.domain}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {project.deployment_status === "deployed" && project.vercel_deployment_url && (
              <a
                href={project.vercel_deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-600"
              >
                <Globe className="h-4 w-4" />
                View Site
              </a>
            )}
            <button
              onClick={triggerGeneration}
              disabled={generating}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {generating ? "Running…" : "Generate"}
            </button>
            <button
              onClick={toggleStatus}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors",
                project.status === "active"
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
              )}
            >
              {project.status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {project.status === "active" ? "Pause" : "Activate"}
            </button>
            <Link
              href={`/projects/${id}/settings`}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-0 border-t border-slate-100">
          {[
            { key: "overview", label: "Overview", icon: LayoutDashboard },
            { key: "content", label: "Content", icon: FileText },
            { key: "operations", label: "Operations", icon: Settings2 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={cn(
                "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === key
                  ? "border-brand-500 text-brand-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
              {key === "content" && draftCount > 0 && (
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  {draftCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Config warning — always visible */}
      {configStatus && !configStatus.openai && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">OpenAI API key missing — generation is disabled</p>
            <p className="mt-1 text-xs text-red-600">
              Add <code className="font-mono">OPENAI_API_KEY=sk-...</code> to <code className="font-mono">.env.local</code> and restart the server.
            </p>
          </div>
        </div>
      )}

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div>
          {/* Onboarding checklist */}
          <SetupChecklist
            id={id}
            project={project}
            queueCounts={queueCounts}
            draftCount={draftCount}
            generating={generating}
            publishing={publishing}
            onGenerate={triggerGeneration}
            onPublish={publishAllDrafts}
          />

          {/* Pipeline bar */}
          <PipelineBar id={id} project={project} draftCount={draftCount} generationRunning={generationRunning} />

          {/* Stats */}
          <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={BookOpen} label="Recipes Published" value={project.recipes_published} color="text-brand-600" bg="bg-orange-50" />
            <StatCard
              icon={KeyRound}
              label="Keywords Remaining"
              value={!project.sheet_url ? queueCounts.pending : project.keywords_remaining}
              color="text-blue-600"
              bg="bg-blue-50"
            />
            <StatCard icon={AlertCircle} label="Keywords Failed" value={project.keywords_failed} color="text-red-500" bg="bg-red-50" />
            <StatCard icon={TrendingUp} label="Success Rate" value={`${successRate}%`} color="text-emerald-600" bg="bg-emerald-50" />
          </div>

          {/* Timing strip */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white">
            <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Last Generation</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(project.last_generation_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Next Scheduled</p>
                  <p className="text-sm font-medium text-slate-900">{formatDate(project.next_scheduled_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-5 py-3.5">
                <Target className="h-4 w-4 shrink-0 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Batch Size</p>
                  <p className="text-sm font-medium text-slate-900">{project.recipes_per_day} recipes / day</p>
                </div>
              </div>
            </div>
          </div>

          {/* Content Health + Activity */}
          {initialRecipes.length > 0 && (
            <ContentHealthCard recipes={initialRecipes} />
          )}
          <ActivityFeed id={id} />
        </div>
      )}

      {/* ── CONTENT TAB ──────────────────────────────────────────────────── */}
      {activeTab === "content" && (
        <div>
          {/* Generation progress card */}
          <GenerationProgressCard
            projectId={id}
            onRunningChange={setGenerationRunning}
            onComplete={() => {
              Promise.all([
                api.get<Project>(`/api/projects/${id}`),
                api.get<{ counts: { pending: number; done: number; failed: number } }>(`/api/projects/${id}/queue`),
              ]).then(([proj, queue]) => {
                setProject(proj);
                setQueueCounts(queue.counts ?? queueCounts);
              }).catch(() => {});
            }}
          />

          {/* Keywords queued banner */}
          {!generationRunning && !generating && queueCounts.pending > 0 && !project.sheet_url && draftCount === 0 && (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <ListChecks className="h-5 w-5 text-brand-600" />
                <div>
                  <p className="text-sm font-medium text-brand-900">
                    {queueCounts.pending} keyword{queueCounts.pending !== 1 ? "s" : ""} queued
                  </p>
                  <p className="mt-0.5 text-xs text-brand-700">
                    Ready to generate — runs up to {project.recipes_per_day} per batch.
                  </p>
                </div>
              </div>
              <button
                onClick={triggerGeneration}
                disabled={generating}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                Generate Now
              </button>
            </div>
          )}

          {/* Publish queue + schedule panel */}
          <div className="mb-6">
            <PublishSchedulePanel
              project={project}
              draftCount={draftCount}
              onPublished={fetchProject}
            />
          </div>

          {/* Keyword queue widget */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900">Keyword Queue</h3>
              <Link href={`/projects/${id}/queue`} className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                Manage →
              </Link>
            </div>
            <div className="flex gap-4 text-sm text-slate-500 mb-3">
              <span><strong className="text-slate-900">{queueCounts.pending}</strong> pending</span>
              <span><strong className="text-slate-900">{queueCounts.done}</strong> done</span>
              {queueCounts.failed > 0 && (
                <span><strong className="text-red-600">{queueCounts.failed}</strong> failed</span>
              )}
            </div>
            <Link
              href={`/projects/${id}/queue`}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              + Add Keywords
            </Link>
          </div>

          {/* Content quick links */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Manage Content</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <QuickLink href={`/projects/${id}/recipes`} icon={BookOpen} title="Recipes" description="View, edit, publish" />
            <QuickLink href={`/projects/${id}/queue`} icon={ListChecks} title="Keyword Queue" description="Add & manage keywords" />
            <QuickLink href={`/projects/${id}/restaurants`} icon={ChefHat} title="Restaurants" description="Edit descriptions, logos" />
            <QuickLink href={`/projects/${id}/categories`} icon={Tag} title="Categories" description="Browse by category" />
          </div>
        </div>
      )}

      {/* ── OPERATIONS TAB ───────────────────────────────────────────────── */}
      {activeTab === "operations" && (
        <div>
          {/* Deployment status card */}
          {(project.deployment_status === "deployed" || project.deployment_status === "failed") && (
            <div className={cn(
              "mb-6 rounded-xl border p-4",
              project.deployment_status === "deployed" ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
            )}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {project.deployment_status === "deployed" ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <p className={cn("text-sm font-semibold", project.deployment_status === "deployed" ? "text-emerald-900" : "text-red-900")}>
                      {project.deployment_status === "deployed" ? "Site is live" : "Last deployment failed"}
                    </p>
                    {project.vercel_deployment_url && (
                      <a href={project.vercel_deployment_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-emerald-700 hover:underline truncate">
                        {project.vercel_deployment_url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {project.deployment_status === "deployed" && (
                    <>
                      <button onClick={checkSiteHealth} disabled={checkingHealth}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                        {checkingHealth ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
                        {healthCheck
                          ? healthCheck.healthy ? `Online · ${healthCheck.latency_ms}ms` : "Unreachable"
                          : checkingHealth ? "Checking…" : "Health"}
                      </button>
                      <button onClick={pingSitemap} disabled={pinging}
                        className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                        {pinging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        {pinging ? "Pinging…" : "Ping"}
                      </button>
                    </>
                  )}
                  <Link href={`/projects/${id}/deploy`}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white",
                      project.deployment_status === "deployed" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                    )}>
                    <Rocket className="h-3.5 w-3.5" />
                    {project.deployment_status === "deployed" ? "Manage Deploy" : "Retry"}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Template changed — needs redeploy */}
          {needsRedeploy && project.deployment_status === "deployed" && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-violet-200 bg-violet-50 px-5 py-4">
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 shrink-0 text-violet-500" />
                <div>
                  <p className="text-sm font-semibold text-violet-900">Template changed — redeploy to apply</p>
                  <p className="mt-0.5 text-xs text-violet-700">
                    Your live site is still using the old template. Redeploy to switch it.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => { localStorage.removeItem(`needs_redeploy_${id}`); setNeedsRedeploy(false); }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-100"
                >
                  Dismiss
                </button>
                <button
                  onClick={triggerRedeploy}
                  disabled={redeploying}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
                >
                  {redeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  {redeploying ? "Deploying…" : "Redeploy Now"}
                </button>
              </div>
            </div>
          )}

          {/* Operations quick links */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Operations</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <QuickLink href={`/projects/${id}/deploy`} icon={Rocket} title="Deploy & Domains" description="Vercel + custom domains" />
            <QuickLink href={`/projects/${id}/logs`} icon={Activity} title="Generation Logs" description="Run history & stats" />
            <QuickLink href={`/projects/${id}/keywords`} icon={KeyRound} title="Keyword Logs" description="Status & timestamps" />
            <QuickLink href={`/projects/${id}/analytics`} icon={BarChart3} title="Analytics" description="Charts & content insights" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Onboarding checklist ──────────────────────────────────────────────────────

function SetupChecklist({
  id, project, queueCounts, draftCount, generating, publishing, onGenerate, onPublish,
}: {
  id: string;
  project: Project;
  queueCounts: { pending: number; done: number; failed: number };
  draftCount: number;
  generating: boolean;
  publishing: boolean;
  onGenerate: () => void;
  onPublish: () => void;
}) {
  const hasKeywords = !!project.sheet_url || (queueCounts.pending + queueCounts.done + queueCounts.failed > 0);
  const hasGenerated = project.recipes_published > 0 || draftCount > 0;
  const hasPublished = project.recipes_published > 0;
  const hasDeployed = project.deployment_status === "deployed";

  const steps = [
    { label: "Project created", done: true, note: "Configured niche, branding & settings" },
    {
      label: "Add keywords",
      done: hasKeywords,
      note: hasKeywords ? `${queueCounts.pending + queueCounts.done} keywords added` : "Paste keywords to start generating recipes",
      cta: !hasKeywords ? { label: "Add Keywords", href: `/projects/${id}/queue` } : undefined,
    },
    {
      label: "Generate recipes",
      done: hasGenerated,
      note: hasGenerated ? "Recipes generated" : "Run AI generation on your keywords",
      cta: !hasGenerated && hasKeywords ? { label: generating ? "Generating…" : "Generate Now", onClick: onGenerate, disabled: generating } : undefined,
    },
    {
      label: "Publish to live site",
      done: hasPublished,
      note: hasPublished ? `${project.recipes_published} recipes published` : "Make recipes visible on your site",
      cta: !hasPublished && draftCount > 0 ? { label: publishing ? "Publishing…" : `Publish All (${draftCount})`, onClick: onPublish, disabled: publishing } : undefined,
    },
    {
      label: "Deploy website to Vercel",
      done: hasDeployed,
      note: hasDeployed ? (project.domain ? `https://${project.domain}` : project.vercel_deployment_url ?? "Your site is live") : "Publish your recipe website for the world to see",
      cta: !hasDeployed ? { label: "Deploy Site", href: `/projects/${id}/deploy` } : undefined,
    },
  ];

  if (steps.every((s) => s.done)) return null;
  const completedCount = steps.filter((s) => s.done).length;
  const pendingSteps = steps.filter((s) => !s.done);

  // Auto-collapse when mostly done; user can expand
  const [collapsed, setCollapsed] = useState(completedCount >= 3);

  if (collapsed) {
    return (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ListChecks className="h-4 w-4 text-brand-500" />
            <span className="text-sm font-semibold text-slate-900">Getting started</span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {completedCount}/{steps.length} done
            </span>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
              {pendingSteps[0]?.label && <>Next: <span className="font-medium text-slate-700">{pendingSteps[0].label}</span></>}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand-500 transition-all duration-500"
                style={{ width: `${(completedCount / steps.length) * 100}%` }} />
            </div>
            <button onClick={() => setCollapsed(false)}
              className="text-xs font-medium text-brand-500 hover:text-brand-600">
              Show ↓
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <ListChecks className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-semibold text-slate-900">Getting started</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {completedCount}/{steps.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${(completedCount / steps.length) * 100}%` }}
            />
          </div>
          {completedCount >= 3 && (
            <button onClick={() => setCollapsed(true)}
              className="text-xs font-medium text-slate-400 hover:text-slate-600">
              Collapse ↑
            </button>
          )}
        </div>
      </div>
      <ul className="divide-y divide-slate-50 px-5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-slate-300" />
            )}
            <div className="flex-1 min-w-0">
              <span className={cn("text-sm font-medium", step.done ? "text-slate-400 line-through" : "text-slate-900")}>
                {step.label}
              </span>
              <p className="text-xs text-slate-400 truncate">{step.note}</p>
            </div>
            {step.cta && (
              step.cta.href ? (
                <Link href={step.cta.href} className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600">
                  {step.cta.label}
                </Link>
              ) : (
                <button
                  onClick={step.cta.onClick}
                  disabled={step.cta.disabled}
                  className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  {step.cta.label}
                </button>
              )
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Pipeline bar ──────────────────────────────────────────────────────────────

function PipelineBar({ id, project, draftCount, generationRunning }: { id: string; project: Project; draftCount: number; generationRunning: boolean }) {
  const siteUrl = project.domain ? `https://${project.domain}` : project.vercel_deployment_url ?? null;
  const totalRecipes = project.recipes_published + draftCount;
  type StageStatus = "done" | "active" | "pending";

  const generateStatus: StageStatus = generationRunning ? "active" : totalRecipes > 0 ? "done" : "pending";
  const publishStatus: StageStatus = project.recipes_published > 0 ? "done" : draftCount > 0 ? "active" : "pending";
  const deployStatus: StageStatus = project.deployment_status === "deployed" ? "done" : project.deployment_status === "deploying" ? "active" : "pending";

  const stageColor = (s: StageStatus) =>
    s === "done" ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    s === "active" ? "text-blue-600 bg-blue-50 border-blue-200" :
    "text-slate-400 bg-slate-50 border-slate-200";

  const dotColor = (s: StageStatus) =>
    s === "done" ? "bg-emerald-400" : s === "active" ? "bg-blue-400 animate-pulse" : "bg-slate-200";

  return (
    <div className="mb-6 flex items-stretch gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
      <Link href={`/projects/${id}/recipes`} className={cn("flex flex-1 items-center gap-3 border-r px-5 py-3.5 transition-colors hover:brightness-95", stageColor(generateStatus))}>
        <div className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(generateStatus))} />
        <Zap className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">Generate</p>
          <p className="text-xs opacity-70 leading-tight">
            {generationRunning ? "Running…" : totalRecipes > 0 ? `${totalRecipes} recipe${totalRecipes !== 1 ? "s" : ""}` : "Not started"}
          </p>
        </div>
      </Link>
      <Link href={`/projects/${id}/recipes?status=draft`} className={cn("flex flex-1 items-center gap-3 border-r px-5 py-3.5 transition-colors hover:brightness-95", stageColor(publishStatus))}>
        <div className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(publishStatus))} />
        <Upload className="h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">Publish</p>
          <p className="text-xs opacity-70 leading-tight">
            {project.recipes_published > 0
              ? `${project.recipes_published} published${draftCount > 0 ? `, ${draftCount} draft` : ""}`
              : draftCount > 0 ? `${draftCount} draft${draftCount !== 1 ? "s" : ""} ready`
              : "No recipes yet"}
          </p>
        </div>
      </Link>
      {siteUrl && project.deployment_status === "deployed" ? (
        <a href={siteUrl} target="_blank" rel="noopener noreferrer" className={cn("flex flex-1 items-center gap-3 px-5 py-3.5 transition-colors hover:brightness-95", stageColor(deployStatus))}>
          <div className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(deployStatus))} />
          <Globe className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold leading-tight">Website Live</p>
            <p className="text-xs opacity-70 leading-tight truncate">{siteUrl}</p>
          </div>
          <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
        </a>
      ) : (
        <Link href={`/projects/${id}/deploy`} className={cn("flex flex-1 items-center gap-3 px-5 py-3.5 transition-colors hover:brightness-95", stageColor(deployStatus))}>
          <div className={cn("h-2 w-2 shrink-0 rounded-full", dotColor(deployStatus))} />
          <Rocket className="h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold leading-tight">Deploy Website</p>
            <p className="text-xs opacity-70 leading-tight">
              {project.deployment_status === "deploying" ? "Building…" :
               project.deployment_status === "failed" ? "Failed — retry" :
               "Launch your recipe site"}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg }: { icon: React.ElementType; label: string; value: string | number; color: string; bg?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", bg ?? "bg-slate-100")}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900 leading-none">{value}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: React.ElementType; title: string; description: string }) {
  return (
    <Link href={href} className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-all duration-150 hover:border-brand-200 hover:shadow-card-hover hover:-translate-y-0.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 group-hover:bg-brand-100 transition-colors">
        <Icon className="h-4 w-4 text-brand-500" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-400 truncate">{description}</p>
      </div>
    </Link>
  );
}

// ── Content Health Card ───────────────────────────────────────────────────────

function ContentHealthCard({ recipes }: { recipes: Recipe[] }) {
  const total = recipes.length;
  if (total === 0) return null;

  const withImages = recipes.filter((r) => !!r.image_url).length;
  const avgWords = Math.round(recipes.reduce((s, r) => s + (r.word_count || 0), 0) / total);
  const withFAQs = recipes.filter((r) => r.faqs && r.faqs.length > 0).length;
  const totalWords = recipes.reduce((s, r) => s + (r.word_count || 0), 0);

  const metrics = [
    { label: "With Images", value: `${Math.round((withImages / total) * 100)}%`, sub: `${withImages} of ${total}`, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Avg Word Count", value: avgWords.toLocaleString(), sub: "words per recipe", color: "text-violet-500", bg: "bg-violet-50" },
    { label: "With FAQs", value: `${Math.round((withFAQs / total) * 100)}%`, sub: `${withFAQs} of ${total}`, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Total Words", value: `${(totalWords / 1000).toFixed(1)}k`, sub: "across all recipes", color: "text-emerald-500", bg: "bg-emerald-50" },
  ];

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Content Health</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className={cn("mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md", m.bg)}>
              <TrendingUp className={cn("h-3.5 w-3.5", m.color)} />
            </div>
            <p className="text-xl font-bold text-slate-900">{m.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{m.label}</p>
            <p className="text-[11px] text-slate-400">{m.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function ActivityFeed({ id }: { id: string }) {
  const [events, setEvents] = useState<Array<{
    id: string;
    type: "generation" | "deployment";
    description: string;
    time: string;
    status: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}/logs`).then((r) => r.ok ? r.json() : { logs: [] }),
      fetch(`/api/projects/${id}/deployments`).then((r) => r.ok ? r.json() : { deployments: [] }),
    ]).then(([logsData, depsData]) => {
      const genEvents = (logsData.logs ?? [] as GenerationLog[]).slice(0, 5).map((log: GenerationLog) => ({
        id: `gen-${log.id}`,
        type: "generation" as const,
        description: `Generated ${(log.keywords_succeeded ?? 0) + (log.keywords_failed ?? 0)} keywords — ${log.keywords_succeeded ?? 0} succeeded, ${log.keywords_failed ?? 0} failed`,
        time: log.started_at,
        status: log.status,
      }));
      const depEvents = (depsData.deployments ?? [] as Deployment[]).slice(0, 2).map((dep: Deployment) => ({
        id: `dep-${dep.id}`,
        type: "deployment" as const,
        description: `Deployed to ${dep.url ?? "Vercel"}`,
        time: dep.created_at,
        status: dep.status,
      }));
      const all = [...genEvents, ...depEvents].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
      ).slice(0, 7);
      setEvents(all);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent Activity</h2>
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading activity…
      </div>
    </div>
  );

  if (events.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Recent Activity</h2>
      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={event.id} className="flex items-start gap-3">
            <div className="relative flex flex-col items-center">
              <div className={cn(
                "mt-1 h-2 w-2 rounded-full shrink-0",
                event.type === "deployment"
                  ? event.status === "ready" ? "bg-emerald-400" : event.status === "error" ? "bg-red-400" : "bg-blue-400"
                  : event.status === "completed" ? "bg-emerald-400" : event.status === "failed" ? "bg-red-400" : "bg-blue-400 animate-pulse"
              )} />
              {i < events.length - 1 && (
                <div className="mt-1 h-full w-px bg-slate-100 absolute top-3 left-1/2 -translate-x-1/2" style={{ minHeight: "16px" }} />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <div className="flex items-center gap-2">
                {event.type === "generation" ? (
                  <Zap className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                ) : (
                  <Rocket className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                )}
                <p className="text-sm text-slate-700 truncate">{event.description}</p>
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{relativeTime(event.time)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
