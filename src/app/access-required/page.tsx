"use client";

import { useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AccessRequiredPage() {
  const [loading, setLoading] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  async function handleUpgrade() {
    setLoading(true);
    try {
      const { url } = await api.post<{ url: string }>("/api/billing/create-checkout", {});
      window.location.href = url;
    } catch {
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md w-full p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-50 mb-4">
          <Sparkles className="h-7 w-7 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Start Building Recipe Sites
        </h1>
        <p className="text-slate-500 mb-6 text-sm leading-relaxed">
          Get full access to Recipe Factory — AI generation, unlimited projects, and one-click Vercel deploys.
        </p>

        <ul className="text-left space-y-2 mb-8">
          {[
            "200 AI-generated recipes per month",
            "Unlimited projects",
            "One-click Vercel deployment",
            "Built-in keyword queue",
            "SEO-optimized templates",
            "Scheduled auto-publishing",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-slate-700">
              <Check className="h-4 w-4 text-green-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mb-4">
          <p className="text-3xl font-bold text-slate-900">$29<span className="text-base font-normal text-slate-500">/month</span></p>
          <p className="text-xs text-slate-400 mt-1">Cancel anytime · No setup fee</p>
        </div>

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? "Redirecting to checkout..." : "Upgrade to Pro — $29/month"}
        </button>

        <button
          onClick={handleSignOut}
          disabled={signOutLoading}
          className="mt-3 w-full text-sm text-slate-400 hover:text-slate-600 py-2"
        >
          {signOutLoading ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
