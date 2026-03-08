"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Project } from "@/lib/types";
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
} from "lucide-react";
import GenerationProgressCard from "@/components/GenerationProgressCard";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [queueCounts, setQueueCounts] = useState<{ pending: number; done: number; failed: number } | null>(null);
  const [generationRunning, setGenerationRunning] = useState(false);
  const [healthCheck, setHealthCheck] = useState<{ healthy: boolean | null; latency_ms?: number; checked_at?: string } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [configStatus, setConfigStatus] = useState<{ openai: boolean; pexels: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/system/config")
      .then((r) => r.json())
      .then(setConfigStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<Project>(`/api/projects/${id}`),
      api.get<{ total: number }>(`/api/projects/${id}/recipes?status=draft&limit=1`),
      api.get<{ counts: { pending: number; done: number; failed: number } }>(`/api/projects/${id}/queue`),
    ])
      .then(([proj, drafts, queue]) => {
        setProject(proj);
        setDraftCount(drafts.total ?? 0);
        setQueueCounts(queue.counts ?? null);
      })
      .catch((err) => {
        console.error("[ProjectDetail] fetch failed:", err);
        if (err instanceof ApiError && err.status === 404) {
          setProject(null);
        } else {
          toast.error("Failed to load project");
          router.push("/");
        }
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function toggleStatus() {
    if (!project) return;
    const newStatus = project.status === "active" ? "paused" : "active";
    try {
      const updated = await api.put<Project>(`/api/projects/${id}`, { status: newStatus });
      setProject(updated);
    } catch (err) {
      toast.error(`Failed to ${newStatus === "active" ? "activate" : "pause"} project`);
      console.error("[ProjectDetail] toggleStatus failed:", err);
    }
  }

  async function publishAllDrafts() {
    setPublishing(true);
    try {
      const result = await api.post<{ published: number; failed: number; message: string }>(
        `/api/projects/${id}/recipes/bulk-publish`
      );
      toast.success(result.message);
      setDraftCount(0);
      const refreshed = await api.get<Project>(`/api/projects/${id}`);
      setProject(refreshed);
    } catch {
      toast.error("Publish failed — check server logs");
    } finally {
      setPublishing(false);
    }
  }

  async function checkSiteHealth() {
    setCheckingHealth(true);
    try {
      const result = await api.get<{ healthy: boolean | null; latency_ms?: number; checked_at?: string }>(
        `/api/projects/${id}/health`
      );
      setHealthCheck(result);
    } catch {
      setHealthCheck({ healthy: false });
    } finally {
      setCheckingHealth(false);
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
      // Poll the project every 4 s for up to 3 minutes to surface updated stats
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const [refreshed, queue] = await Promise.all([
            api.get<Project>(`/api/projects/${id}`),
            api.get<{ counts: { pending: number; done: number; failed: number } }>(`/api/projects/${id}/queue`),
          ]);
          setProject(refreshed);
          setQueueCounts(queue.counts ?? null);
        } catch { /* ignore transient errors */ }
        if (attempts >= 45) clearInterval(poll);
      }, 4000);
    } catch (err) {
      const msg = err instanceof ApiError
        ? `Generation failed: ${(err.body as { details?: string })?.details ?? err.statusText}`
        : "Generation failed — check server logs";
      toast.error(msg);
      console.error("[ProjectDetail] generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Project not found.</p>
        <Link href="/" className="mt-2 text-brand-500 hover:text-brand-600">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const successRate =
    project.recipes_published + project.keywords_failed > 0
      ? Math.round(
          (project.recipes_published /
            (project.recipes_published + project.keywords_failed)) *
            100
        )
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

      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl text-2xl font-bold text-white"
            style={{ backgroundColor: project.primary_color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {project.name}
            </h1>
            <p className="text-sm text-slate-500">{project.niche}</p>
            {project.domain && (
              <p className="mt-0.5 text-xs text-slate-400">{project.domain}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            onClick={toggleStatus}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors",
              project.status === "active"
                ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            )}
          >
            {project.status === "active" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {project.status === "active" ? "Pause Schedule" : "Activate Schedule"}
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

      {/* Onboarding checklist — disappears once all steps done */}
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

      {/* Deployment Banner */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {project.deployment_status === "deployed" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            ) : project.deployment_status === "deploying" ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
                <Rocket className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-900">
                {project.deployment_status === "deployed"
                  ? "Site is live"
                  : project.deployment_status === "deploying"
                  ? "Deploying..."
                  : project.deployment_status === "failed"
                  ? "Last deployment failed"
                  : "Not deployed yet"}
              </p>
              {project.vercel_deployment_url ? (
                <a
                  href={project.vercel_deployment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600"
                >
                  {project.vercel_deployment_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-xs text-slate-400">
                  Deploy your recipe site to go live
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {project.deployment_status === "deployed" && project.vercel_deployment_url && (
              <a
                href={project.vercel_deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
                Open Site
              </a>
            )}
            <Link
              href={`/projects/${id}/deploy`}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
            >
              <Rocket className="h-4 w-4" />
              {project.deployment_status === "deployed" ? "Manage" : "Deploy"}
            </Link>
          </div>
        </div>
        {project.domain && project.deployment_status === "deployed" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Globe className="h-3.5 w-3.5" />
            Custom domain: <span className="font-medium">{project.domain}</span>
          </div>
        )}
        {project.deployment_status === "deployed" && (
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={checkSiteHealth}
              disabled={checkingHealth}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {checkingHealth ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              {checkingHealth ? "Checking…" : "Check site health"}
            </button>
            {healthCheck && (
              <span className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                healthCheck.healthy === true
                  ? "bg-emerald-100 text-emerald-700"
                  : healthCheck.healthy === false
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-500"
              )}>
                {healthCheck.healthy === true ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : healthCheck.healthy === false ? (
                  <WifiOff className="h-3.5 w-3.5" />
                ) : null}
                {healthCheck.healthy === true
                  ? `Online · ${healthCheck.latency_ms}ms`
                  : healthCheck.healthy === false
                  ? "Unreachable"
                  : "No URL"}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Workflow action strip — one banner at a time ── */}

      {/* Step 0: config error */}
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

      {/* Step 1: keywords queued (hidden while generation is running or just finished) */}
      {!generationRunning && !generating && queueCounts && queueCounts.pending > 0 && !project.sheet_url && draftCount === 0 && (
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

      {/* Step 2: generation running — progress card handles its own visibility */}
      <GenerationProgressCard
        projectId={id}
        onRunningChange={setGenerationRunning}
        onComplete={() => {
          Promise.all([
            api.get<Project>(`/api/projects/${id}`),
            api.get<{ counts: { pending: number; done: number; failed: number } }>(`/api/projects/${id}/queue`),
          ]).then(([proj, queue]) => {
            setProject(proj);
            setQueueCounts(queue.counts ?? null);
          }).catch(() => {});
        }}
      />

      {/* Step 3: drafts ready to publish (hidden while generation is running) */}
      {!generationRunning && draftCount > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {draftCount} draft recipe{draftCount !== 1 ? "s" : ""} ready to publish
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Not visible on your live site until published.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${id}/recipes`}
              className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              Review
            </Link>
            <button
              onClick={publishAllDrafts}
              disabled={publishing}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {publishing ? "Publishing..." : "Publish All Now"}
            </button>
          </div>
        </div>
      )}

      {/* Generate → Publish → Deploy pipeline */}
      <PipelineBar
        id={id}
        project={project}
        draftCount={draftCount}
        generationRunning={generationRunning}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Recipes Published" value={project.recipes_published} color="text-brand-500" />
        <StatCard
          icon={KeyRound}
          label="Keywords Remaining"
          value={!project.sheet_url && queueCounts != null ? queueCounts.pending : project.keywords_remaining}
          color="text-blue-500"
        />
        <StatCard icon={AlertCircle} label="Keywords Failed" value={project.keywords_failed} color="text-red-500" />
        <StatCard icon={TrendingUp} label="Success Rate" value={`${successRate}%`} color="text-emerald-500" />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4" />
            Last Generation
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {formatDate(project.last_generation_at)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Calendar className="h-4 w-4" />
            Next Scheduled
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {formatDate(project.next_scheduled_at)}
          </p>
          <p className="mt-1 text-xs text-slate-400">Manual Run triggers immediately</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Target className="h-4 w-4" />
            Recipes / Day
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {project.recipes_per_day}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickLink href={`/projects/${id}/recipes`} icon={BookOpen} title="Recipes" description="View all generated recipes, edit content, manage publishing" />
        <QuickLink href={`/projects/${id}/queue`} icon={ListChecks} title="Keyword Queue" description="Add and manage keywords to generate — no Google Sheets needed" />
        <QuickLink href={`/projects/${id}/restaurants`} icon={ChefHat} title="Restaurants" description="Auto-created from keywords — edit descriptions, logos, links" />
        <QuickLink href={`/projects/${id}/categories`} icon={Tag} title="Categories" description="Auto-created from recipe AI output — browse by category" />
        <QuickLink href={`/projects/${id}/keywords`} icon={KeyRound} title="Keyword Logs" description="Keyword processing log with status and timestamps" />
        <QuickLink href={`/projects/${id}/logs`} icon={BarChart3} title="Generation Logs" description="History of all generation runs with success/failure stats" />
        <QuickLink href={`/projects/${id}/deploy`} icon={Rocket} title="Deploy & Domains" description="Deploy your recipe site to Vercel and connect custom domains" />
      </div>
    </div>
  );
}

// ── Onboarding checklist ──────────────────────────────────────────────────────

interface ChecklistProps {
  id: string;
  project: Project;
  queueCounts: { pending: number; done: number; failed: number } | null;
  draftCount: number;
  generating: boolean;
  publishing: boolean;
  onGenerate: () => void;
  onPublish: () => void;
}

function SetupChecklist({ id, project, queueCounts, draftCount, generating, publishing, onGenerate, onPublish }: ChecklistProps) {
  const hasKeywords =
    !!project.sheet_url ||
    (queueCounts != null && queueCounts.pending + queueCounts.done + queueCounts.failed > 0);
  const hasGenerated = project.recipes_published > 0 || draftCount > 0;
  const hasPublished = project.recipes_published > 0;
  const hasDeployed = project.deployment_status === "deployed";

  const steps = [
    { label: "Project created", done: true, note: "Configured niche, branding & settings" },
    {
      label: "Add keywords",
      done: hasKeywords,
      note: hasKeywords
        ? `${(queueCounts?.pending ?? 0) + (queueCounts?.done ?? 0)} keywords added`
        : "Paste keywords to start generating recipes",
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
      note: hasDeployed
        ? (project.domain ? `https://${project.domain}` : project.vercel_deployment_url ?? "Your site is live")
        : "Publish your recipe website for the world to see",
      cta: !hasDeployed ? { label: "Deploy Site", href: `/projects/${id}/deploy` } : undefined,
    },
  ];

  if (steps.every((s) => s.done)) return null;

  const completedCount = steps.filter((s) => s.done).length;

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
        <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>
      </div>
      <ul className="divide-y divide-slate-50 px-5">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-3 py-3">
            {step.done ? (
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-4.5 w-4.5 shrink-0 text-slate-300" />
            )}
            <div className="flex-1 min-w-0">
              <span className={cn("text-sm font-medium", step.done ? "text-slate-400 line-through" : "text-slate-900")}>
                {step.label}
              </span>
              <p className="text-xs text-slate-400 truncate">{step.note}</p>
            </div>
            {step.cta && (
              step.cta.href ? (
                <Link
                  href={step.cta.href}
                  className="shrink-0 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600"
                >
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

// ── Generate → Publish → Deploy pipeline bar ──────────────────────────────────

interface PipelineBarProps {
  id: string;
  project: Project;
  draftCount: number;
  generationRunning: boolean;
}

function PipelineBar({ id, project, draftCount, generationRunning }: PipelineBarProps) {
  const siteUrl = project.domain
    ? `https://${project.domain}`
    : project.vercel_deployment_url ?? null;
  const totalRecipes = project.recipes_published + draftCount;

  type StageStatus = "done" | "active" | "pending";

  const generateStatus: StageStatus = generationRunning ? "active" : totalRecipes > 0 ? "done" : "pending";
  const publishStatus: StageStatus =
    project.recipes_published > 0 ? "done" : draftCount > 0 ? "active" : "pending";
  const deployStatus: StageStatus =
    project.deployment_status === "deployed" ? "done" :
    project.deployment_status === "deploying" ? "active" : "pending";

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
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("flex flex-1 items-center gap-3 px-5 py-3.5 transition-colors hover:brightness-95", stageColor(deployStatus))}
        >
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
              {project.deployment_status === "deploying" ? "Building…"
                : project.deployment_status === "failed" ? "Failed — retry"
                : "Launch your recipe site"}
            </p>
          </div>
        </Link>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-5 w-5", color)} />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

function QuickLink({ href, icon: Icon, title, description }: { href: string; icon: React.ElementType; title: string; description: string }) {
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-brand-200 hover:shadow-sm">
      <Icon className="h-6 w-6 text-brand-500" />
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </Link>
  );
}
