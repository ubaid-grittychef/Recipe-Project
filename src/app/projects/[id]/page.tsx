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
    ])
      .then(([proj, drafts]) => {
        setProject(proj);
        setDraftCount(drafts.total ?? 0);
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
          const refreshed = await api.get<Project>(`/api/projects/${id}`);
          setProject(refreshed);
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
          <button
            onClick={triggerGeneration}
            disabled={generating}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-600 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {generating ? "Running..." : "Manual Run"}
          </button>
          <button
            onClick={toggleStatus}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-colors",
              project.status === "active"
                ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            )}
          >
            {project.status === "active" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
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

      {/* API key / config warning banner */}
      {configStatus && !configStatus.openai && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-800">OpenAI API key missing — generation is disabled</p>
            <p className="mt-1 text-xs text-red-600">
              Add <code className="font-mono">OPENAI_API_KEY=sk-...</code> to your <code className="font-mono">.env.local</code> file, then restart the server.
              Get a free key at <strong>platform.openai.com/api-keys</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Draft recipes banner */}
      {draftCount > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {draftCount} draft recipe{draftCount !== 1 ? "s" : ""} ready to publish
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                Draft recipes are saved but not visible on your live site yet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={publishAllDrafts}
              disabled={publishing}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-600 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {publishing ? "Publishing..." : "Publish All Now"}
            </button>
            <Link
              href={`/projects/${id}/recipes`}
              className="rounded-lg border border-amber-200 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
            >
              Review
            </Link>
          </div>
        </div>
      )}

      {/* Live generation progress */}
      <GenerationProgressCard
        projectId={id}
        onComplete={() => {
          // Refresh project stats when a run finishes
          api.get<Project>(`/api/projects/${id}`)
            .then(setProject)
            .catch(() => {});
        }}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={BookOpen} label="Recipes Published" value={project.recipes_published} color="text-brand-500" />
        <StatCard icon={KeyRound} label="Keywords Remaining" value={project.keywords_remaining} color="text-blue-500" />
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
