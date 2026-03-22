"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Project, Deployment } from "@/lib/types";
import { api } from "@/lib/api-client";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Rocket,
  Globe,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Trash2,
  Plus,
  AlertTriangle,
  Server,
  Shield,
  Database,
} from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

interface Props {
  id: string;
  initialProject: Project;
  initialDeployments: Deployment[];
  hasVercelToken: boolean;
}

interface DomainResult {
  configured: boolean;
  verification?: { type: string; domain: string; value: string }[];
}

interface SiteStatus {
  connected: boolean;
  hasTable: boolean;
  recipeCount: number;
  error?: string;
}

export default function DeployClient({ id, initialProject, initialDeployments, hasVercelToken }: Props) {
  const [project, setProject] = useState<Project>(initialProject);
  const [deployments, setDeployments] = useState<Deployment[]>(initialDeployments);
  const [deploying, setDeploying] = useState(false);
  const [resetting, setResetting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainVerification, setDomainVerification] = useState<DomainResult | null>(null);
  const [siteStatus, setSiteStatus] = useState<SiteStatus | null>(null);
  const [checkingSite, setCheckingSite] = useState(false);
  const [settingUpDb, setSettingUpDb] = useState(false);
  const [resettingDb, setResettingDb] = useState(false);

  // Check site DB status on mount if Supabase URL is configured
  useEffect(() => {
    if (project.site_supabase_url && project.site_supabase_anon_key) {
      checkSiteStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start polling if deployment is already in progress when page loads.
  // Cleanup on unmount to prevent stale intervals after navigation.
  useEffect(() => {
    if (project.deployment_status === "deploying") {
      startPolling();
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkSiteStatus() {
    setCheckingSite(true);
    try {
      const result = await api.get<SiteStatus>(`/api/projects/${id}/site`);
      setSiteStatus(result);
    } catch {
      // non-critical
    } finally {
      setCheckingSite(false);
    }
  }

  async function setupDatabase() {
    setSettingUpDb(true);
    try {
      await api.post(`/api/projects/${id}/site`, { action: "setup-schema" });
      toast.success("Database schema created successfully");
      await checkSiteStatus();
    } catch {
      toast.error("Failed to set up database — check your Supabase credentials");
    } finally {
      setSettingUpDb(false);
    }
  }

  async function resetDatabase() {
    if (!confirm("This will DELETE all recipes from the site database. Use this when reusing the same Supabase project for a new site.\n\nAre you sure?")) return;
    setResettingDb(true);
    try {
      await api.post(`/api/projects/${id}/site`, { action: "reset-schema" });
      toast.success("Site database reset — ready for a new site");
      await checkSiteStatus();
    } catch {
      toast.error("Reset failed — check your Supabase service key");
    } finally {
      setResettingDb(false);
    }
  }

  function startPolling() {
    // Clear any existing poll before starting a new one
    if (pollRef.current) clearInterval(pollRef.current);

    setDeploying(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const [proj, deps] = await Promise.all([
          api.get<Project>(`/api/projects/${id}`),
          api.get<Deployment[]>(`/api/projects/${id}/deployments`),
        ]);
        setProject(proj);
        setDeployments(Array.isArray(deps) ? deps : []);

        const done = proj.deployment_status === "deployed" || proj.deployment_status === "failed";
        if (done || attempts >= 75) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setDeploying(false);
          if (proj.deployment_status === "deployed") {
            toast.success("Site is live!");
          } else if (proj.deployment_status === "failed") {
            toast.error("Deployment failed — check the history below");
          }
        }
      } catch { /* ignore transient errors */ }
    }, 4000);
  }

  async function handleDeploy() {
    try {
      await api.post(`/api/projects/${id}/deploy`);
      toast.success("Deployment started — uploading files to Vercel...");
      startPolling();
    } catch {
      toast.error("Deployment failed — check server logs");
    }
  }

  async function handleResetDeployment() {
    setResetting(true);
    try {
      await api.post(`/api/projects/${id}/deploy/reset`, {});
      const [proj, deps] = await Promise.all([
        api.get<Project>(`/api/projects/${id}`),
        api.get<Deployment[]>(`/api/projects/${id}/deployments`),
      ]);
      setProject(proj);
      setDeployments(Array.isArray(deps) ? deps : []);
      setDeploying(false);
      toast.info("Deployment status reset — you can try again");
    } catch {
      toast.error("Failed to reset deployment status");
    } finally {
      setResetting(false);
    }
  }

  async function handleAddDomain() {
    if (!domainInput.trim()) return;
    setAddingDomain(true);
    try {
      const result = await api.post<DomainResult>(`/api/projects/${id}/domain`, {
        domain: domainInput.trim(),
      });
      setDomainVerification(result);
      const proj = await api.get<Project>(`/api/projects/${id}`);
      setProject(proj);
      if (result.configured) {
        toast.success("Domain connected successfully!");
      } else {
        toast.info("Domain added — DNS verification required");
      }
    } catch {
      toast.error("Failed to add domain");
    } finally {
      setAddingDomain(false);
    }
  }

  async function handleRemoveDomain() {
    if (!project.domain) return;
    if (!confirm(`Remove domain ${project.domain}?`)) return;
    try {
      await api.delete(`/api/projects/${id}/domain`, { domain: project.domain });
      setDomainVerification(null);
      const proj = await api.get<Project>(`/api/projects/${id}`);
      setProject(proj);
      toast.success("Domain removed");
    } catch {
      toast.error("Failed to remove domain");
    }
  }

  // Checklist items — shown before every deploy, not just the first
  const checks = [
    {
      label: "Site Supabase URL configured",
      ok: !!project.site_supabase_url,
      fix: (
        <Link href={`/projects/${id}/settings`} className="ml-auto text-xs text-brand-500 hover:underline">
          Add in Settings →
        </Link>
      ),
    },
    {
      label: "Site Supabase Anon Key configured",
      ok: !!project.site_supabase_anon_key,
      fix: (
        <Link href={`/projects/${id}/settings`} className="ml-auto text-xs text-brand-500 hover:underline">
          Add in Settings →
        </Link>
      ),
    },
    {
      label: "Site database table created",
      ok: siteStatus?.hasTable === true,
      loading: checkingSite,
      fix: project.site_supabase_url && project.site_supabase_anon_key ? (
        <button
          onClick={setupDatabase}
          disabled={settingUpDb}
          className="ml-auto flex items-center gap-1 text-xs text-brand-500 hover:underline disabled:opacity-50"
        >
          {settingUpDb ? <Loader2 className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
          {settingUpDb ? "Setting up…" : "Setup Now"}
        </button>
      ) : null,
    },
    {
      label: "Vercel API token configured",
      ok: !!project.vercel_token || hasVercelToken,
      fix: (
        <Link href={`/projects/${id}/settings`} className="ml-auto text-xs text-brand-500 hover:underline">
          Add in Settings →
        </Link>
      ),
    },
    {
      label: `Published recipes: ${project.recipes_published}`,
      ok: project.recipes_published > 0,
      warning: true, // warn but don't block
      fix: (
        <Link href={`/projects/${id}/recipes`} className="ml-auto text-xs text-brand-500 hover:underline">
          Publish recipes →
        </Link>
      ),
    },
  ];

  const blockingFailed = checks.filter((c) => !c.ok && !c.warning).length > 0;

  return (
    <div>
      <Breadcrumbs items={[
        { label: "All Projects", href: "/" },
        { label: project.name, href: `/projects/${id}` },
        { label: "Deploy" },
      ]} />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Deploy & Domains</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deploy <span className="font-medium">{project.name}</span> as a live website and connect your custom domain
        </p>
      </div>

      {/* Live site hero — shown only when deployed */}
      {project.deployment_status === "deployed" && project.vercel_deployment_url && (
        <div className="mb-6 overflow-hidden rounded-xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 dark:from-emerald-950/50 to-teal-50 dark:to-teal-950/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {project.logo_url ? (
                <img
                  src={project.logo_url}
                  alt={project.name}
                  className="h-14 w-14 shrink-0 rounded-xl object-contain border border-border bg-card p-1"
                />
              ) : (
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white"
                  style={{ backgroundColor: project.primary_color }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Your website is live</p>
                <p className="mt-0.5 text-lg font-bold text-foreground">{project.name}</p>
                <a
                  href={project.domain ? `https://${project.domain}` : project.vercel_deployment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                >
                  {project.domain ?? project.vercel_deployment_url}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <a
              href={project.domain ? `https://${project.domain}` : project.vercel_deployment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600"
            >
              <Globe className="h-4 w-4" />
              Open Website
            </a>
          </div>
        </div>
      )}

      {/* Deployment Status Card */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              project.deployment_status === "deployed" ? "bg-emerald-50 dark:bg-emerald-950/50"
              : project.deployment_status === "deploying" ? "bg-blue-50 dark:bg-blue-950/50"
              : project.deployment_status === "failed" ? "bg-red-50 dark:bg-red-950/50"
              : "bg-muted/50"
            )}>
              {project.deployment_status === "deployed" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : project.deployment_status === "deploying" ? (
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              ) : project.deployment_status === "failed" ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : (
                <Server className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {project.deployment_status === "deployed" ? "Site is Live"
                : project.deployment_status === "deploying" ? "Deploying…"
                : project.deployment_status === "failed" ? "Deployment Failed"
                : "Not Deployed Yet"}
              </h3>
              {project.vercel_deployment_url ? (
                <a
                  href={project.vercel_deployment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 flex items-center gap-1 text-sm text-brand-500 hover:text-brand-600"
                >
                  {project.vercel_deployment_url}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {project.deployment_status === "deploying"
                    ? "Uploading files and building…"
                    : "Click deploy to publish your recipe site"}
                </p>
              )}
              {project.template_variant && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Template: <span className={cn("font-medium", project.template_variant === "premium" ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground")}>
                    {project.template_variant === "premium" ? "Premium" : "Default"}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {project.deployment_status === "deployed" && (
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", deploying && "animate-spin")} />
                Redeploy
              </button>
            )}
            {(project.deployment_status === "deploying" || deploying) && (
              <button
                onClick={handleResetDeployment}
                disabled={resetting}
                className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-50"
              >
                {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Cancel
              </button>
            )}
            <button
              onClick={handleDeploy}
              disabled={deploying || project.deployment_status === "deploying" || blockingFailed}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              {deploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {deploying
                ? "Deploying…"
                : project.deployment_status === "deployed"
                ? "Deploy Update"
                : "Deploy to Vercel"}
            </button>
          </div>
        </div>

        {/* Pre-deploy checklist — always visible */}
        <div className="mt-6 rounded-lg border border-border/50 bg-muted/50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Deployment Checklist</p>
          <ul className="space-y-2">
            {checks.map((check) => (
              <li key={check.label} className="flex items-center gap-2 text-sm">
                {check.loading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                ) : check.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : check.warning ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                )}
                <span className={cn(
                  check.ok ? "text-muted-foreground"
                  : check.warning ? "text-amber-700 dark:text-amber-400"
                  : "text-red-700 dark:text-red-400"
                )}>
                  {check.label}
                </span>
                {!check.ok && check.fix}
              </li>
            ))}
          </ul>
          {blockingFailed && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-medium">
              Fix the items above before deploying.
            </p>
          )}
        </div>
      </div>

      {/* Custom Domain */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-brand-500" />
          <h3 className="font-semibold text-foreground">Custom Domain</h3>
        </div>

        {project.domain ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-foreground">{project.domain}</p>
                  <p className="text-xs text-muted-foreground">Custom domain</p>
                </div>
              </div>
              <button
                onClick={handleRemoveDomain}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {domainVerification && !domainVerification.configured && (
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-4">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">DNS verification required</p>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                  Add these DNS records at your domain registrar:
                </p>
                {domainVerification.verification && Array.isArray(domainVerification.verification) && (
                  <div className="mt-3 space-y-2">
                    {domainVerification.verification.map((v, i) => (
                      <div key={i} className="rounded-md bg-card p-3 text-xs font-mono">
                        <p className="text-muted-foreground">Type: <span className="text-foreground">{v.type}</span></p>
                        <p className="text-muted-foreground">Name: <span className="text-foreground">{v.domain}</span></p>
                        <p className="text-muted-foreground">Value: <span className="text-foreground break-all">{v.value}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">
              Connect your own domain to this recipe site.
              {project.deployment_status !== "deployed" && (
                <span className="text-amber-600 dark:text-amber-400"> Deploy the site first.</span>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. copycatkitchen.com"
                disabled={project.deployment_status !== "deployed"}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
              />
              <button
                onClick={handleAddDomain}
                disabled={addingDomain || !domainInput.trim() || project.deployment_status !== "deployed"}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {addingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Domain
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Site Database Management */}
      {project.site_supabase_url && (
        <div className="mb-6 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Site Database</h3>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Reusing this Supabase project for a new website? Reset the database to wipe all recipes and start fresh — your credentials stay the same.
          </p>
          <div className="flex items-center gap-3">
            {siteStatus && (
              <span className="text-sm text-muted-foreground">
                {siteStatus.hasTable ? `${siteStatus.recipeCount} recipe${siteStatus.recipeCount !== 1 ? "s" : ""} in site DB` : "No table yet"}
              </span>
            )}
            <button
              onClick={resetDatabase}
              disabled={resettingDb}
              className="ml-auto flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-50"
            >
              {resettingDb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Reset Site Database
            </button>
          </div>
        </div>
      )}

      {/* Deployment History */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 font-semibold text-foreground">Deployment History</h3>
        {deployments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deployments yet. Click Deploy to publish your site.</p>
        ) : (
          <div className="space-y-3">
            {deployments.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {dep.status === "ready" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : dep.status === "building" || dep.status === "queued" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-sm text-foreground">
                      {dep.url ? (
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-500 hover:text-brand-600"
                        >
                          {dep.url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">
                          {dep.status === "error" ? dep.error_message || "Failed" : "Building…"}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(dep.created_at)}</p>
                  </div>
                </div>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium",
                  dep.status === "ready" && "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400",
                  (dep.status === "building" || dep.status === "queued") && "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400",
                  dep.status === "error" && "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400",
                  dep.status === "canceled" && "bg-secondary text-muted-foreground"
                )}>
                  {dep.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
