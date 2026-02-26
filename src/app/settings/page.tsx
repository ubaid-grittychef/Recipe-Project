"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface ServiceStatus {
  openai: boolean;
  google: boolean;
  factory_db: boolean;
  vercel: boolean;
  pexels: boolean;
  auth: boolean;
  scheduler: { activeJobs: number; jobIds: string[] };
}

export default function FactorySettingsPage() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStatus() {
    setLoading(true);
    try {
      const data = await api.get<ServiceStatus>("/api/settings/status");
      setStatus(data);
    } catch {
      toast.error("Failed to load service status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Factory Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Global configuration and service connection status
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {loading && !status ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
        </div>
      ) : (
        <div className="space-y-4">
          <StatusCard
            title="OpenAI API Key"
            description="Required for AI recipe generation. Set OPENAI_API_KEY in .env.local"
            status={status?.openai ?? false}
            envVar="OPENAI_API_KEY"
          />
          <StatusCard
            title="Google Service Account"
            description="Required for reading keywords from Google Sheets. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
            status={status?.google ?? false}
            envVar="GOOGLE_SERVICE_ACCOUNT_EMAIL"
          />
          <StatusCard
            title="Factory Database (Supabase)"
            description="Optional. Without Supabase, data is stored in memory (dev mode only)."
            status={status?.factory_db ?? false}
            envVar="NEXT_PUBLIC_SUPABASE_URL"
          />
          <StatusCard
            title="Vercel Deployment Token"
            description="Required for deploying recipe sites. Set VERCEL_TOKEN in .env.local"
            status={status?.vercel ?? false}
            envVar="VERCEL_TOKEN"
          />
          <StatusCard
            title="Pexels API Key"
            description="Required for auto-fetching recipe images. Free at pexels.com/api"
            status={status?.pexels ?? false}
            envVar="PEXELS_API_KEY"
          />
          <StatusCard
            title="Dashboard Authentication"
            description="Password protects the factory dashboard. Leave empty to disable auth."
            status={status?.auth ?? false}
            envVar="FACTORY_PASSWORD"
          />

          {status?.scheduler && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-medium text-slate-900">Scheduler</h3>
              <p className="mt-1 text-sm text-slate-500">
                {status.scheduler.activeJobs} active generation job
                {status.scheduler.activeJobs !== 1 ? "s" : ""}
              </p>
              {status.scheduler.jobIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {status.scheduler.jobIds.map((id) => (
                    <span
                      key={id}
                      className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                    >
                      {id.slice(0, 8)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusCard({
  title,
  description,
  status,
  envVar,
}: {
  title: string;
  description: string;
  status: boolean;
  envVar: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-medium text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
          <p className="mt-1.5 font-mono text-xs text-slate-400">{envVar}</p>
        </div>
        <div title={status ? "Configured" : "Not configured"}>
          {status ? (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
              <XCircle className="h-3.5 w-3.5" />
              Not Set
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
