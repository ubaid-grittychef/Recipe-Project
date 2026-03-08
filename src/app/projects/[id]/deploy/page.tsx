"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Project, Deployment } from "@/lib/types";
import { api } from "@/lib/api-client";
import { cn, formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  ArrowLeft,
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
} from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

interface DomainResult {
  configured: boolean;
  verification?: { type: string; domain: string; value: string }[];
}

export default function DeployPage({ params }: Props) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainVerification, setDomainVerification] = useState<DomainResult | null>(null);
  const [hasVercelToken, setHasVercelToken] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Project>(`/api/projects/${id}`),
      api.get<Deployment[]>(`/api/projects/${id}/deployments`),
      api.get<{ vercel: boolean }>("/api/settings/status"),
    ])
      .then(([proj, deps, status]) => {
        setProject(proj);
        setDeployments(Array.isArray(deps) ? deps : []);
        setHasVercelToken(status.vercel ?? false);
      })
      .catch((err) => {
        console.error("[Deploy] load failed:", err);
        toast.error("Failed to load deployment info");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDeploy() {
    setDeploying(true);
    try {
      await api.post(`/api/projects/${id}/deploy`);
      toast.success("Deployment started — uploading files to Vercel...");

      // Poll project + deployments until status leaves "deploying" (up to 5 min)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const [proj, deps] = await Promise.all([
            api.get<Project>(`/api/projects/${id}`),
            api.get<Deployment[]>(`/api/projects/${id}/deployments`),
          ]);
          setProject(proj);
          setDeployments(Array.isArray(deps) ? deps : []);

          const done =
            proj.deployment_status === "deployed" ||
            proj.deployment_status === "failed";
          if (done || attempts >= 75) {
            clearInterval(poll);
            setDeploying(false);
            if (proj.deployment_status === "deployed") {
              toast.success("Site is live!");
            } else if (proj.deployment_status === "failed") {
              toast.error("Deployment failed — check logs");
            }
          }
        } catch { /* ignore transient errors */ }
      }, 4000);
    } catch (err) {
      toast.error("Deployment failed — check server logs");
      console.error("[Deploy] failed:", err);
      setDeploying(false);
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
    } catch (err) {
      toast.error("Failed to add domain");
      console.error("[Deploy] add domain failed:", err);
    } finally {
      setAddingDomain(false);
    }
  }

  async function handleRemoveDomain() {
    if (!project?.domain) return;
    if (!confirm(`Remove domain ${project.domain}?`)) return;
    try {
      await api.delete(`/api/projects/${id}/domain`, { domain: project.domain });
      setDomainVerification(null);
      const proj = await api.get<Project>(`/api/projects/${id}`);
      setProject(proj);
      toast.success("Domain removed");
    } catch (err) {
      toast.error("Failed to remove domain");
      console.error("[Deploy] remove domain failed:", err);
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
        <Link href="/" className="text-brand-500">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/projects/${id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Project
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Deploy & Domains
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Deploy {project.name} as a live website and connect your custom domain
        </p>
      </div>

      {/* Live site hero — shown only when deployed */}
      {project.deployment_status === "deployed" && project.vercel_deployment_url && (
        <div className="mb-6 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Globe className="h-7 w-7 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Your website is live</p>
                <p className="mt-0.5 text-lg font-bold text-slate-900">{project.name}</p>
                <a
                  href={project.domain ? `https://${project.domain}` : project.vercel_deployment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
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
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl",
              project.deployment_status === "deployed"
                ? "bg-emerald-50"
                : project.deployment_status === "deploying"
                ? "bg-blue-50"
                : project.deployment_status === "failed"
                ? "bg-red-50"
                : "bg-slate-50"
            )}>
              {project.deployment_status === "deployed" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : project.deployment_status === "deploying" ? (
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              ) : project.deployment_status === "failed" ? (
                <XCircle className="h-6 w-6 text-red-500" />
              ) : (
                <Server className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                {project.deployment_status === "deployed"
                  ? "Site is Live"
                  : project.deployment_status === "deploying"
                  ? "Deploying..."
                  : project.deployment_status === "failed"
                  ? "Deployment Failed"
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
                <p className="mt-0.5 text-sm text-slate-400">
                  Click deploy to publish your recipe site
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {project.deployment_status === "deployed" && (
              <button
                onClick={handleDeploy}
                disabled={deploying}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={cn("h-4 w-4", deploying && "animate-spin")} />
                Redeploy
              </button>
            )}
            <button
              onClick={handleDeploy}
              disabled={deploying || project.deployment_status === "deploying"}
              className="flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 disabled:opacity-50"
            >
              {deploying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {deploying
                ? "Deploying..."
                : project.deployment_status === "deployed"
                ? "Deploy Update"
                : "Deploy to Vercel"}
            </button>
          </div>
        </div>

        {/* Pre-deploy checklist */}
        {project.deployment_status === "not_deployed" && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">Before deploying, make sure:</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-700">
                  <li className="flex items-center gap-2">
                    {project.site_supabase_url ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    )}
                    Site Supabase URL is configured
                  </li>
                  <li className="flex items-center gap-2">
                    {project.site_supabase_anon_key ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    )}
                    Site Supabase Anon Key is configured
                  </li>
                  <li className="flex items-center gap-2">
                    {hasVercelToken ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-400" />
                    )}
                    VERCEL_TOKEN is set in environment
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Domain */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-brand-500" />
          <h3 className="font-semibold text-slate-900">Custom Domain</h3>
        </div>

        {project.domain ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {project.domain}
                  </p>
                  <p className="text-xs text-slate-400">
                    Custom domain
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemoveDomain}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {domainVerification && !domainVerification.configured && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-800">
                  DNS verification required
                </p>
                <p className="mt-1 text-xs text-amber-700">
                  Add these DNS records at your domain registrar:
                </p>
                {domainVerification.verification && Array.isArray(domainVerification.verification) && (
                  <div className="mt-3 space-y-2">
                    {domainVerification.verification.map((v, i) => (
                      <div key={i} className="rounded-md bg-white p-3 text-xs font-mono">
                        <p className="text-slate-500">Type: <span className="text-slate-900">{v.type}</span></p>
                        <p className="text-slate-500">Name: <span className="text-slate-900">{v.domain}</span></p>
                        <p className="text-slate-500">Value: <span className="text-slate-900 break-all">{v.value}</span></p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-slate-500">
              Connect your own domain to this recipe site.
              {project.deployment_status !== "deployed" && (
                <span className="text-amber-600"> Deploy the site first.</span>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. copycatkitchen.com"
                disabled={project.deployment_status !== "deployed"}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
              />
              <button
                onClick={handleAddDomain}
                disabled={addingDomain || !domainInput.trim() || project.deployment_status !== "deployed"}
                className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {addingDomain ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add Domain
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deployment History */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-slate-900">
          Deployment History
        </h3>
        {deployments.length === 0 ? (
          <p className="text-sm text-slate-400">
            No deployments yet. Click Deploy to publish your site.
          </p>
        ) : (
          <div className="space-y-3">
            {deployments.map((dep) => (
              <div
                key={dep.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
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
                    <p className="text-sm text-slate-700">
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
                        <span className="text-slate-400">
                          {dep.status === "error"
                            ? dep.error_message || "Failed"
                            : "Building..."}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDate(dep.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    dep.status === "ready" && "bg-emerald-100 text-emerald-700",
                    (dep.status === "building" || dep.status === "queued") &&
                      "bg-blue-100 text-blue-700",
                    dep.status === "error" && "bg-red-100 text-red-700",
                    dep.status === "canceled" && "bg-slate-100 text-slate-500"
                  )}
                >
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
