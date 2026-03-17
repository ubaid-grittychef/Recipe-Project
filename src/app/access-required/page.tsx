"use client";

import { ChefHat, Lock, Loader2 } from "lucide-react";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AccessRequiredPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@example.com";

  async function handleSignOut() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
          <Lock className="h-7 w-7 text-amber-600" />
        </div>
        <div className="mt-3 mx-auto flex h-8 w-8 items-center justify-center">
          <ChefHat className="h-5 w-5 text-slate-400" />
        </div>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Subscription Required</h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          You need an active subscription to access the Recipe Factory dashboard.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Contact{" "}
          <a href={`mailto:${contactEmail}`} className="text-brand-600 hover:underline font-medium">
            {contactEmail}
          </a>{" "}
          to get access.
        </p>
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign Out"}
        </button>
      </div>
    </div>
  );
}
