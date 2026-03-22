"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { CreditCard, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Profile } from "@/lib/types";

export default function BillingPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    api.get<Profile>("/api/auth/me")
      .then(setProfile)
      .catch(() => toast.error("Failed to load billing info"))
      .finally(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/api/billing/create-portal", {});
      window.location.href = url;
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading billing info...</div>;

  const isActive = profile?.subscription_status === "active";
  const periodEnd = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Billing</h1>

      <div className="bg-card rounded-xl border border-border p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Subscription</h2>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground mb-6">
          <div className="flex justify-between">
            <span>Plan</span>
            <span className="font-medium text-foreground capitalize">{profile?.subscription_plan ?? "Free"}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span className={`font-medium ${isActive ? "text-green-600" : "text-red-600"}`}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {periodEnd && (
            <div className="flex justify-between">
              <span>Renews</span>
              <span className="font-medium text-foreground">{periodEnd}</span>
            </div>
          )}
        </div>

        {isActive ? (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="flex items-center gap-2 text-sm px-4 py-2 border border-border rounded-lg hover:bg-accent disabled:opacity-50"
          >
            {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Manage subscription
          </button>
        ) : (
          <Link
            href="/access-required"
            className="inline-block text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>
    </div>
  );
}
