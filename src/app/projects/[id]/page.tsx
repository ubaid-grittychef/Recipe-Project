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
} from "lucide-react";
import GenerationProgressCard from "@/components/GenerationProgressCard";
import { SkeletonProjectDetail } from "@/components/Skeleton";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api
      .get<Project>(`/api/projects/${id}`)
      .then(setProject)
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

  async function triggerGeneration() {
    setGenerating(true);
    try {
      await api.post(`/api/projects/${id}/generate`);
      toast.success("Generation started — watch the progress card below");
      // GenerationProgressCard handles live polling — just refresh stats once after 5s
      setTimeout(async () => {
        try {
          const refreshed = await api.get<Project>(`/api/projects/${id}`);
          setProject(refreshed);
        } catch { /* ignore */ }
      }, 5000);
    } catch (err) {
      const msg = err instanceof ApiError
        ? `Generation failed: ${(err.body as { details?: string })?.details ?? err.statusText}`
        : "Generation failed — check server logs";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <SkeletonProjectDetail />;
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

  // Setup checklist — derive from project state
  const hasSiteDb = !!(project.site_supabase_url && project.site_supabase_service_key);
  const hasSheet = !!project.sheet_url;
  const hasRecipes = project.recipes_published > 0;
  const hasDeployment = project.deployment_status === "deployed";
  const checklistDone = hasSiteDb && hasSheet && hasRecipes && hasDeployment;

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
          <Link
            href={`/projects/${id}/deploy`}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600"
          >
            <Rocket className="h-4 w-4" />
            {project.deployment_status === "deployed" ? "Manage" : "Deploy"}
          </Link>
        </div>
        {project.domain && project.deployment_status === "deployed" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Globe className="h-3.5 w-3.5" />
            Custom domain: <span className="font-medium">{project.domain}</span>
          </div>
        )}
      </div>

      {/* ── Setup Checklist ──────────────────────────────────────────────── */}
      {!checklistDone && (
        <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-blue-900">
            Setup checklist — complete these steps to go live
          </h3>
          <ul className="space-y-2">
            <ChecklistItem done label="Project created" />
            <ChecklistItem
              done={hasSheet}
              label="Google Sheet connected"
              action={!hasSheet ? { href: `/projects/${id}/settings`, text: "Configure in Settings" } : undefined}
            />
            <ChecklistItem
              done={hasSiteDb}
              label="Site database configured (Supabase)"
              action={!hasSiteDb ? { href: `/projects/${id}/settings`, text: "Add in Settings → Site Database" } : undefined}
              warn={!hasSiteDb}
              warnText="Without this, generated recipes won't appear on your live site"
            />
            <ChecklistItem
              done={hasRecipes}
              label="Recipes generated & published"
              action={!hasRecipes ? { href: `/projects/${id}/recipes`, text: "Generate & publish recipes" } : undefined}
            />
            <ChecklistItem
              done={hasDeployment}
              label="Site deployed to Vercel"
              action={!hasDeployment ? { href: `/projects/${id}/deploy`, text: "Deploy now" } : undefined}
            />
          </ul>
        </div>
      )}

      {/* ── Site DB warning (shown even when checklist is dismissed) ─────── */}
      {!hasSiteDb && checklistDone === false && hasRecipes && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">Site database not configured.</span>{" "}
            Recipes are saved but won&apos;t appear on your live site until you add your Supabase credentials.{" "}
            <Link href={`/projects/${id}/settings`} className="font-medium underline">
              Configure now →
            </Link>
          </p>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <QuickLink href={`/projects/${id}/recipes`} icon={BookOpen} title="Recipes" description="View all generated recipes, edit content, manage publishing" />
        <QuickLink href={`/projects/${id}/restaurants`} icon={ChefHat} title="Restaurants" description="Manage restaurant CMS entries — each becomes a category page" />
        <QuickLink href={`/projects/${id}/keywords`} icon={KeyRound} title="Keywords" description="Keyword processing log with status and timestamps" />
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

function ChecklistItem({
  done,
  label,
  action,
  warn,
  warnText,
}: {
  done: boolean;
  label: string;
  action?: { href: string; text: string };
  warn?: boolean;
  warnText?: string;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <div className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", done ? "bg-emerald-500" : warn ? "bg-amber-400" : "bg-slate-200")}>
        {done && (
          <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
          </svg>
        )}
      </div>
      <div className="flex-1">
        <span className={cn("text-sm", done ? "text-slate-600 line-through" : "text-slate-800")}>{label}</span>
        {!done && action && (
          <Link href={action.href} className="ml-2 text-xs font-medium text-brand-500 hover:text-brand-600">
            {action.text} →
          </Link>
        )}
        {!done && warn && warnText && (
          <p className="mt-0.5 text-xs text-amber-600">{warnText}</p>
        )}
      </div>
    </li>
  );
}
