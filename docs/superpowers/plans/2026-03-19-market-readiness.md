# Market Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the four critical gaps blocking paid launch: Stripe billing, cost controls/quotas, transactional email via Resend, and legal pages.

**Architecture:** Stripe handles checkout and webhooks → sets `subscription_status` on the profiles table → middleware already gates non-active users to `/access-required`. Resend sends emails triggered at key lifecycle events. Quotas are stored per-profile and enforced in the generate route. Legal pages are static Next.js pages added to the factory dashboard.

**Tech Stack:** stripe (npm), @stripe/stripe-js (npm), resend (npm), @react-email/components (npm), Next.js App Router, Supabase (profiles table)

---

## Context: What Already Exists

- `src/middleware.ts` — already redirects `subscription_status !== 'active'` users to `/access-required`
- `src/lib/types.ts` — `Profile` already has `stripe_customer_id: string | null` and `subscription_status: SubscriptionStatus`
- `src/app/access-required/page.tsx` — exists, needs upgrade CTA wired to checkout
- `supabase/factory-schema.sql` — profiles table schema
- `src/app/admin/users/AdminUsersClient.tsx` — admin panel already exists

---

## Phase 1 — Stripe Billing

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/lib/stripe.ts` | Create — Stripe server client singleton |
| `src/app/api/billing/create-checkout/route.ts` | Create — POST creates Stripe checkout session |
| `src/app/api/billing/create-portal/route.ts` | Create — POST creates Stripe billing portal session |
| `src/app/api/webhooks/stripe/route.ts` | Create — handles Stripe webhook events |
| `src/app/access-required/page.tsx` | Modify — add "Upgrade Now" button wired to checkout |
| `src/app/billing/page.tsx` | Create — billing management page (manage subscription) |
| `src/lib/types.ts` | Modify — add `SubscriptionPlan` type |
| `supabase/factory-schema.sql` | Modify — add `subscription_plan`, `stripe_subscription_id`, `current_period_end` to profiles |
| `factory-schema.sql` | Modify — same |

---

### Task 1: Install Stripe and configure environment

**Files:** `package.json`, `.env.local`, `.env.example`

- [ ] **Step 1: Install Stripe packages**
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project"
npm install stripe @stripe/stripe-js
```

- [ ] **Step 2: Add env vars to `.env.local`**

Add these lines (get values from Stripe Dashboard → Developers → API keys):
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

- [ ] **Step 3: Update `.env.example`** with placeholder entries:
```
STRIPE_SECRET_KEY=sk_test_your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
STRIPE_PRO_PRICE_ID=price_your_price_id_here
```

- [ ] **Step 4: Create Stripe product in dashboard**

In Stripe Dashboard (test mode):
- Create product: "Recipe Factory Pro"
- Add price: $29/month, recurring, USD
- Copy the Price ID → paste as `STRIPE_PRO_PRICE_ID`

- [ ] **Step 5: Commit**
```bash
git add package.json package-lock.json .env.example
git commit -m "feat: install stripe and add env var placeholders"
```

---

### Task 2: Stripe server client singleton

**Files:**
- Create: `src/lib/stripe.ts`

- [ ] **Step 1: Create `src/lib/stripe.ts`**
```typescript
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});

export const PLANS = {
  pro: {
    name: "Recipe Factory Pro",
    priceId: process.env.STRIPE_PRO_PRICE_ID!,
    monthlyRecipeQuota: 200,
    price: "$29/month",
  },
} as const;
```

- [ ] **Step 2: Add schema columns to both SQL files**

In `supabase/factory-schema.sql` and `factory-schema.sql`, in the `profiles` CREATE TABLE, add after `stripe_customer_id`:
```sql
  stripe_subscription_id text,
  subscription_plan text not null default 'free',
  current_period_end timestamptz,
```

At the end of both files, add migration block:
```sql
-- Market readiness migration
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
```

- [ ] **Step 3: Update Profile type in `src/lib/types.ts`**

Add to the `Profile` interface after `stripe_customer_id`:
```typescript
stripe_subscription_id: string | null;
subscription_plan: "free" | "pro";
current_period_end: string | null;
```

- [ ] **Step 4: Commit**
```bash
git add src/lib/stripe.ts src/lib/types.ts supabase/factory-schema.sql factory-schema.sql
git commit -m "feat: add Stripe client singleton and schema fields for billing"
```

---

### Task 3: Checkout session API route

**Files:**
- Create: `src/app/api/billing/create-checkout/route.ts`

- [ ] **Step 1: Create the route**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe, PLANS } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Billing:Checkout");

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, full_name")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        name: profile?.full_name ?? undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PLANS.pro.priceId, quantity: 1 }],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/access-required?checkout=cancelled`,
      metadata: { supabase_user_id: user.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Failed to create checkout session", {}, err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add `NEXT_PUBLIC_APP_URL` to `.env.local` and `.env.example`**
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
(Set to production URL in Vercel env vars for production)

- [ ] **Step 3: Commit**
```bash
git add src/app/api/billing/create-checkout/route.ts .env.example
git commit -m "feat: add Stripe checkout session API route"
```

---

### Task 4: Billing portal API route

**Files:**
- Create: `src/app/api/billing/create-portal/route.ts`

- [ ] **Step 1: Create the route**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { stripe } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:Billing:Portal");

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account found" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    log.error("Failed to create portal session", {}, err);
    return NextResponse.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/billing/create-portal/route.ts
git commit -m "feat: add Stripe billing portal API route"
```

---

### Task 5: Stripe webhook handler

**Files:**
- Create: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create the webhook route**

> ⚠️ This route MUST run on Node.js runtime (not Edge) — `stripe.webhooks.constructEvent` requires Node.js crypto. It must also be added to `PUBLIC_PATHS` in middleware so Stripe's server-to-server request (no user cookie) isn't blocked. See Task 15 for the middleware update.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { createLogger } from "@/lib/logger";

// Required: webhook must run on Node.js runtime for crypto support
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("API:Webhooks:Stripe");

// Must use service role key to update profiles from webhook (no user session)
function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    log.error("Webhook signature verification failed", {}, err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as { metadata?: { supabase_user_id?: string }; customer?: string; subscription?: string };
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        // Get subscription details
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
        let periodEnd: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          periodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }

        // Also initialize quota_reset_at to start of next month
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

        await supabase.from("profiles").update({
          subscription_status: "active",
          subscription_plan: "pro",
          stripe_subscription_id: subscriptionId,
          current_period_end: periodEnd,
          recipes_generated_this_month: 0,
          quota_reset_at: nextMonth,
        }).eq("id", userId);

        log.info("Subscription activated", { userId });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as { metadata?: { supabase_user_id?: string }; customer: string; status: string; current_period_end: number };
        // Look up user by stripe_customer_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", sub.customer)
          .single();
        if (!profile) break;

        const isActive = sub.status === "active" || sub.status === "trialing";
        await supabase.from("profiles").update({
          subscription_status: isActive ? "active" : "inactive",
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        }).eq("id", profile.id);

        log.info("Subscription updated", { userId: profile.id, status: sub.status });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as { customer: string };
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", sub.customer)
          .single();
        if (!profile) break;

        await supabase.from("profiles").update({
          subscription_status: "inactive",
          subscription_plan: "free",
          stripe_subscription_id: null,
          current_period_end: null,
        }).eq("id", profile.id);

        log.info("Subscription cancelled", { userId: profile.id });
        break;
      }

      default:
        log.info("Unhandled webhook event", { type: event.type });
    }
  } catch (err) {
    log.error("Webhook handler error", { eventType: event.type }, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Set up Stripe CLI for local webhook testing**

Install Stripe CLI, then run:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
Copy the webhook signing secret printed to console → set as `STRIPE_WEBHOOK_SECRET` in `.env.local`.

- [ ] **Step 3: Commit**
```bash
git add src/app/api/webhooks/stripe/route.ts
git commit -m "feat: add Stripe webhook handler for subscription lifecycle"
```

---

### Task 6: Update `/access-required` page with upgrade CTA

**Files:**
- Modify: `src/app/access-required/page.tsx`

- [ ] **Step 1: Read the current file**

Read `src/app/access-required/page.tsx` to understand existing markup.

- [ ] **Step 2: Replace or rewrite with upgrade UI**

Make it a `"use client"` component. Replace "contact support" text with:
```tsx
"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Sparkles, Check } from "lucide-react";

export default function AccessRequiredPage() {
  const [loading, setLoading] = useState(false);

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

        {/* Feature list */}
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
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add src/app/access-required/page.tsx
git commit -m "feat: wire access-required page to Stripe checkout"
```

---

### Task 7: Billing management page

**Files:**
- Create: `src/app/billing/page.tsx`

- [ ] **Step 1: Create billing page**

```tsx
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

  if (loading) return <div className="p-8 text-center text-slate-500">Loading billing info...</div>;

  const isActive = profile?.subscription_status === "active";
  const periodEnd = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Billing</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-5 w-5 text-slate-500" />
          <h2 className="font-semibold text-slate-900">Subscription</h2>
        </div>

        <div className="space-y-2 text-sm text-slate-600 mb-6">
          <div className="flex justify-between">
            <span>Plan</span>
            <span className="font-medium text-slate-900 capitalize">{profile?.subscription_plan ?? "Free"}</span>
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
              <span className="font-medium text-slate-900">{periodEnd}</span>
            </div>
          )}
        </div>

        {isActive ? (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="flex items-center gap-2 text-sm px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
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
```

- [ ] **Step 2: Add `/api/auth/me` route if it doesn't exist**

Check if `src/app/api/auth/me/route.ts` exists. If not, create:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return NextResponse.json(profile);
}
```

- [ ] **Step 3: Add billing link to sidebar**

In `src/components/layout/Sidebar.tsx` (or `AppShell.tsx`), add a "Billing" nav link pointing to `/billing`.

- [ ] **Step 4: Commit**
```bash
git add src/app/billing/page.tsx src/app/api/auth/me/route.ts src/components/layout/
git commit -m "feat: add billing management page"
```

---

## Phase 2 — Cost Controls (Monthly Recipe Quotas)

### Files to Create/Modify
| File | Action |
|------|--------|
| `supabase/factory-schema.sql` | Modify — add quota columns to profiles |
| `factory-schema.sql` | Modify — same |
| `src/lib/types.ts` | Modify — add quota fields to Profile |
| `src/app/api/projects/[id]/generate/route.ts` | Modify — enforce quota before starting generation |
| `src/components/layout/AppShell.tsx` or header | Modify — show quota usage badge |

---

### Task 8: Add quota columns to DB and types

**Files:**
- Modify: `supabase/factory-schema.sql`, `factory-schema.sql`, `src/lib/types.ts`

- [ ] **Step 1: Add columns to both SQL schema files**

In `profiles` CREATE TABLE, add:
```sql
  -- Usage quotas
  monthly_recipe_quota integer not null default 200,
  recipes_generated_this_month integer not null default 0,
  quota_reset_at timestamptz,
```

At the end of both files, add migration:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_recipe_quota INTEGER NOT NULL DEFAULT 200;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS recipes_generated_this_month INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ;
```

- [ ] **Step 2: Add to Profile interface in `src/lib/types.ts`**
```typescript
monthly_recipe_quota: number;
recipes_generated_this_month: number;
quota_reset_at: string | null;
```

- [ ] **Step 3: Commit**
```bash
git add supabase/factory-schema.sql factory-schema.sql src/lib/types.ts
git commit -m "feat: add monthly recipe quota columns to profiles"
```

---

### Task 9: Enforce quota in the generate route

**Files:**
- Modify: `src/app/api/projects/[id]/generate/route.ts`

- [ ] **Step 1: Read the current generate route**

Read `src/app/api/projects/[id]/generate/route.ts` to understand existing auth pattern.

- [ ] **Step 2: Add quota check before generation starts**

> ⚠️ **Race condition note:** The reset-and-check logic below has a potential race if two generation requests arrive simultaneously (both see `quota_reset_at <= now`, both reset). At this scale (per-user monthly reset) this is unlikely to be exploited — document it as a known limitation. A future hardening step would move the reset into a Postgres function with `WHERE quota_reset_at <= now AND quota_reset_at IS NOT NULL`.

After the existing auth check (where user is fetched), add:
```typescript
// Fetch profile for quota check
const supabaseService = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const { data: profile } = await supabaseService
  .from("profiles")
  .select("monthly_recipe_quota, recipes_generated_this_month, quota_reset_at, role")
  .eq("id", user.id)
  .single();

if (profile && profile.role !== "admin") {
  // Reset counter if billing period rolled over
  const now = new Date();
  if (!profile.quota_reset_at || new Date(profile.quota_reset_at) <= now) {
    await supabaseService.from("profiles").update({
      recipes_generated_this_month: 0,
      quota_reset_at: new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString(),
    }).eq("id", user.id);
    profile.recipes_generated_this_month = 0;
  }

  if (profile.recipes_generated_this_month >= profile.monthly_recipe_quota) {
    return NextResponse.json({
      error: `Monthly quota reached (${profile.monthly_recipe_quota} recipes). Resets on the 1st of next month.`,
    }, { status: 429 });
  }
}
```

- [ ] **Step 3: Increment counter after successful generation**

After the generation run completes (where `succeeded` count is available), add:
```typescript
if (profile && profile.role !== "admin" && succeeded > 0) {
  await supabaseService.from("profiles").update({
    recipes_generated_this_month: profile.recipes_generated_this_month + succeeded,
  }).eq("id", user.id).catch(() => {});
}
```

- [ ] **Step 4: Show quota usage in UI**

In `src/app/page.tsx` (dashboard) or the sidebar, show quota usage. Pass it from the server component fetch or add to the AppShell header as a small badge: `"X / 200 recipes this month"`.

- [ ] **Step 5: Commit**
```bash
git add src/app/api/projects/[id]/generate/route.ts src/app/page.tsx
git commit -m "feat: enforce monthly recipe quota per user"
```

---

## Phase 3 — Transactional Email via Resend

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/lib/email.ts` | Create — Resend client + send helpers |
| `src/emails/WelcomeEmail.tsx` | Create — welcome email template |
| `src/emails/QuotaWarningEmail.tsx` | Create — 80% quota warning |
| `src/app/api/auth/signup/route.ts` (or Supabase hook) | Modify — trigger welcome email |
| `src/app/api/projects/[id]/generate/route.ts` | Modify — trigger quota warning email |

---

### Task 10: Install Resend and create email client

**Files:**
- Create: `src/lib/email.tsx` *(note: `.tsx` extension required for React import)*

- [ ] **Step 1: Install Resend**
```bash
npm install resend @react-email/components
```

- [ ] **Step 2: Add env var**

Add to `.env.local` and `.env.example`:
```
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=hello@yourdomain.com
```

Get API key from resend.com → API Keys.

- [ ] **Step 3: Create `src/lib/email.tsx`**
```typescript
import type { ReactElement } from "react";
import { Resend } from "resend";
import { createLogger } from "./logger";

const log = createLogger("Email");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.RESEND_FROM_EMAIL ?? "hello@recipefactory.app";

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: ReactElement;
}) {
  if (!resend) {
    log.warn("Resend not configured — skipping email", { to, subject });
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, react });
    log.info("Email sent", { to, subject });
  } catch (err) {
    log.error("Failed to send email", { to, subject }, err);
    // Non-fatal — don't throw
  }
}
```

- [ ] **Step 4: Commit**
```bash
git add package.json package-lock.json src/lib/email.ts .env.example
git commit -m "feat: install Resend and create email send helper"
```

---

### Task 11: Welcome email template

**Files:**
- Create: `src/emails/WelcomeEmail.tsx`

- [ ] **Step 1: Create the template**
```tsx
import {
  Html, Head, Body, Container, Heading, Text, Button, Hr, Preview
} from "@react-email/components";

interface Props {
  firstName: string;
  loginUrl: string;
}

export function WelcomeEmail({ firstName, loginUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Recipe Factory — your first recipe site awaits</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#fff", borderRadius: 12, padding: 32 }}>
          <Heading style={{ color: "#0f172a", fontSize: 24, fontWeight: 700 }}>
            Welcome to Recipe Factory 🍳
          </Heading>
          <Text style={{ color: "#475569", fontSize: 15, lineHeight: "24px" }}>
            Hi {firstName}, your account is active and ready to go.
          </Text>
          <Text style={{ color: "#475569", fontSize: 15, lineHeight: "24px" }}>
            Here's how to launch your first recipe site in 10 minutes:
          </Text>
          <ol style={{ color: "#475569", fontSize: 15, lineHeight: "28px" }}>
            <li>Create a project and choose your niche</li>
            <li>Add keywords via the built-in queue or a Google Sheet</li>
            <li>Hit Generate — AI writes and illustrates every recipe</li>
            <li>Publish drafts and deploy your site to Vercel</li>
          </ol>
          <Button
            href={loginUrl}
            style={{ background: "#f97316", color: "#fff", padding: "12px 24px", borderRadius: 8, fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: 16 }}
          >
            Open Recipe Factory →
          </Button>
          <Hr style={{ margin: "32px 0", borderColor: "#e2e8f0" }} />
          <Text style={{ color: "#94a3b8", fontSize: 12 }}>
            Questions? Reply to this email — we read every one.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Trigger welcome email on signup**

Read `src/app/api/auth/callback/route.ts` to understand the current flow. After `supabase.auth.exchangeCodeForSession()`, detect a new user by checking if their `created_at` is within the last 60 seconds — this is the most reliable heuristic without a DB trigger:

```typescript
import { sendEmail } from "@/lib/email";
import { WelcomeEmail } from "@/emails/WelcomeEmail";

// After exchangeCodeForSession:
const { data: { user } } = await supabase.auth.getUser();
if (user) {
  const createdMs = new Date(user.created_at).getTime();
  const isNewUser = Date.now() - createdMs < 60_000; // within last 60 seconds

  if (isNewUser) {
    // Fetch profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    // Fire-and-forget — don't block the redirect
    sendEmail({
      to: user.email!,
      subject: "Welcome to Recipe Factory 🍳",
      react: WelcomeEmail({
        firstName: profile?.full_name?.split(" ")[0] ?? "there",
        loginUrl: appUrl,
      }),
    });
  }
}
```

- [ ] **Step 3: Commit**
```bash
git add src/emails/WelcomeEmail.tsx src/app/api/auth/
git commit -m "feat: add welcome email triggered on new user signup"
```

---

### Task 12: Quota warning email

**Files:**
- Create: `src/emails/QuotaWarningEmail.tsx`
- Modify: `src/app/api/projects/[id]/generate/route.ts`

- [ ] **Step 1: Create the template**
```tsx
import { Html, Head, Body, Container, Heading, Text, Button, Preview } from "@react-email/components";

interface Props {
  firstName: string;
  used: number;
  quota: number;
  billingUrl: string;
}

export function QuotaWarningEmail({ firstName, used, quota, billingUrl }: Props) {
  return (
    <Html>
      <Head />
      <Preview>You've used {used} of {quota} recipes this month</Preview>
      <Body style={{ backgroundColor: "#f8fafc", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "40px auto", background: "#fff", borderRadius: 12, padding: 32 }}>
          <Heading style={{ color: "#0f172a", fontSize: 22, fontWeight: 700 }}>
            You're at 80% of your monthly quota
          </Heading>
          <Text style={{ color: "#475569", fontSize: 15 }}>
            Hi {firstName}, you've generated {used} of {quota} recipes this month.
            Your quota resets on the 1st.
          </Text>
          <Text style={{ color: "#475569", fontSize: 15 }}>
            Once you hit {quota}, generation will pause until next month.
          </Text>
          <Button
            href={billingUrl}
            style={{ background: "#f97316", color: "#fff", padding: "12px 24px", borderRadius: 8, fontWeight: 600, textDecoration: "none", display: "inline-block", marginTop: 8 }}
          >
            View Billing
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
```

- [ ] **Step 2: Trigger in generate route**

In `src/app/api/projects/[id]/generate/route.ts`, after incrementing the counter:
```typescript
const newTotal = profile.recipes_generated_this_month + succeeded;
const pct = newTotal / profile.monthly_recipe_quota;
if (pct >= 0.8 && (profile.recipes_generated_this_month / profile.monthly_recipe_quota) < 0.8) {
  // Just crossed 80% — send warning (only once)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  sendEmail({
    to: user.email!,
    subject: "You've used 80% of your monthly recipe quota",
    react: QuotaWarningEmail({
      firstName: "there",
      used: newTotal,
      quota: profile.monthly_recipe_quota,
      billingUrl: `${appUrl}/billing`,
    }),
  });
}
```

- [ ] **Step 3: Commit**
```bash
git add src/emails/QuotaWarningEmail.tsx src/app/api/projects/[id]/generate/route.ts
git commit -m "feat: send quota warning email at 80% usage"
```

---

## Phase 4 — Legal Pages

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/app/terms/page.tsx` | Create — Terms of Service |
| `src/app/privacy/page.tsx` | Create — Privacy Policy |
| `src/components/layout/AppShell.tsx` or footer | Modify — add footer with legal links |

---

### Task 13: Terms of Service page

**Files:**
- Create: `src/app/terms/page.tsx`

- [ ] **Step 1: Create terms page**
```tsx
export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const lastUpdated = "March 2026";
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: {lastUpdated}</p>

      <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">1. Acceptance</h2>
          <p>By using Recipe Factory ("the Service"), you agree to these terms. If you do not agree, stop using the Service immediately.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">2. Description of Service</h2>
          <p>Recipe Factory is a SaaS tool that uses AI to generate recipe content and deploys recipe websites to Vercel. You are responsible for the content published on sites you deploy.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">3. Acceptable Use</h2>
          <p>You agree not to use the Service to generate spam, misleading content, or material that violates applicable law. Abuse of AI generation (e.g., running bots to circumvent quotas) will result in account termination.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">4. Billing</h2>
          <p>Subscriptions are billed monthly via Stripe. You may cancel at any time from your billing settings. No refunds are issued for partial months.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">5. Intellectual Property</h2>
          <p>AI-generated recipe content is owned by you, the subscriber. Recipe Factory retains no rights to your generated content. You own your deployed sites.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">6. Limitation of Liability</h2>
          <p>The Service is provided "as is". Recipe Factory is not liable for any indirect, incidental, or consequential damages arising from use of the Service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">7. Changes</h2>
          <p>We may update these terms with 14 days' notice via email. Continued use after notice constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">8. Contact</h2>
          <p>Questions? Email us at support@recipefactory.app.</p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/terms/page.tsx
git commit -m "feat: add Terms of Service page"
```

---

### Task 14: Privacy Policy page

**Files:**
- Create: `src/app/privacy/page.tsx`

- [ ] **Step 1: Create privacy page**
```tsx
export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const lastUpdated = "March 2026";
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: {lastUpdated}</p>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">1. Data We Collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Account data:</strong> email address, full name (provided at signup)</li>
            <li><strong>Usage data:</strong> projects created, recipes generated, deployment history</li>
            <li><strong>Billing data:</strong> managed by Stripe — we store only a Stripe customer ID, never raw card numbers</li>
            <li><strong>Log data:</strong> errors, generation requests (retained 30 days)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">2. How We Use Data</h2>
          <p>We use your data to operate the Service, send transactional emails (billing, quota alerts), and improve the product. We do not sell your data to third parties.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">3. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Supabase</strong> — database and authentication (EU/US data centres)</li>
            <li><strong>OpenAI</strong> — recipe content generation (keywords and prompts are sent to OpenAI)</li>
            <li><strong>Stripe</strong> — payment processing (PCI-compliant)</li>
            <li><strong>Vercel</strong> — hosting for deployed sites</li>
            <li><strong>Pexels</strong> — recipe images</li>
            <li><strong>Resend</strong> — transactional email</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">4. Data Retention</h2>
          <p>Account data is retained while your account is active. On deletion, your data is removed from our systems within 30 days. Stripe retains billing records per their policy.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">5. Your Rights</h2>
          <p>You may request a copy of your data or deletion of your account at any time by emailing support@recipefactory.app.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">6. Cookies</h2>
          <p>We use only session cookies for authentication (Supabase Auth). No tracking or advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">7. Contact</h2>
          <p>Privacy questions: support@recipefactory.app</p>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/privacy/page.tsx
git commit -m "feat: add Privacy Policy page"
```

---

### Task 15: Add legal footer to the dashboard

**Files:**
- Modify: `src/components/layout/AppShell.tsx` (or Sidebar.tsx)

- [ ] **Step 1: Find and read the layout wrapper**

Read `src/components/layout/AppShell.tsx` to find where the main content area ends.

- [ ] **Step 2: Add a minimal footer at the bottom of the sidebar or main layout**
```tsx
{/* Legal footer */}
<div className="mt-auto pt-4 border-t border-slate-100 text-xs text-slate-400 space-x-3 px-4 pb-4">
  <a href="/terms" className="hover:text-slate-600">Terms</a>
  <a href="/privacy" className="hover:text-slate-600">Privacy</a>
</div>
```

- [ ] **Step 3: Make `/terms`, `/privacy`, and `/api/webhooks/` public paths in middleware**

In `src/middleware.ts`, add to `PUBLIC_PATHS`:
```typescript
"/terms",
"/privacy",
"/api/webhooks/",  // Stripe webhook — auth handled by STRIPE_WEBHOOK_SECRET signature check
```

> ⚠️ `/api/webhooks/` MUST be public. Stripe's server sends requests with no user session cookie, so middleware would otherwise redirect the webhook request to `/access-required`, silently breaking all billing events.

- [ ] **Step 4: Verify RLS policy on `profiles` table**

The `/api/auth/me` route uses the anon key and relies on Supabase RLS to allow users to select their own row. Confirm the following policy exists in Supabase:
```sql
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
```
If it doesn't exist, add it. Without it, `/api/auth/me` returns null and the billing page renders blank.

- [ ] **Step 4: Commit**
```bash
git add src/components/layout/ src/middleware.ts
git commit -m "feat: add legal footer links and make terms/privacy public"
```

---

## Phase 5 — Final Polish

### Task 16: Test the full billing flow end-to-end

- [ ] **Step 1: Start local server and Stripe CLI**
```bash
# Terminal 1:
npm run dev

# Terminal 2:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

- [ ] **Step 2: Test checkout**
  - Create a test account → should redirect to `/access-required`
  - Click "Upgrade" → redirects to Stripe checkout
  - Use test card `4242 4242 4242 4242`, any future date, any CVC
  - After checkout, should redirect to `/?checkout=success`
  - User's `subscription_status` should now be `"active"` in Supabase

- [ ] **Step 3: Test billing portal**
  - Navigate to `/billing` → shows "Pro" plan and "Manage subscription" button
  - Click "Manage subscription" → opens Stripe billing portal
  - Cancel subscription → webhook fires → `subscription_status` becomes `"inactive"` → middleware blocks access

- [ ] **Step 4: Test quota**
  - Set `monthly_recipe_quota = 2` on a test user in Supabase
  - Generate 2 recipes → works
  - Attempt 3rd → 429 error with quota message in UI

- [ ] **Step 5: Commit env var documentation**
```bash
git add .env.example
git commit -m "docs: update env var documentation for billing, email, app URL"
```

---

### Task 17: Run production build to confirm no TypeScript errors

- [ ] **Step 1: Run build**
```bash
npm run build
```
Expected: no TypeScript errors, clean compile.

- [ ] **Step 2: Fix any type errors surfaced**

Common fixes needed:
- Add `stripe_subscription_id`, `subscription_plan`, `current_period_end`, `monthly_recipe_quota`, `recipes_generated_this_month`, `quota_reset_at` to the Supabase `profiles` select queries that use `select("*")`
- Ensure `Profile` type in `src/lib/types.ts` matches all new columns

- [ ] **Step 3: Final commit**
```bash
git add -A
git commit -m "chore: fix TypeScript errors from market readiness additions"
git push origin main
```

---

## Verification Checklist

- [ ] New user signs up → redirected to `/access-required`
- [ ] Clicking "Upgrade to Pro" opens Stripe checkout
- [ ] Test card completes checkout → user lands on dashboard with full access
- [ ] `/billing` page shows plan name, status, and renewal date
- [ ] "Manage subscription" → Stripe portal opens
- [ ] Cancelling in portal → middleware blocks dashboard on next request → `/access-required`
- [ ] `monthly_recipe_quota = 2` test: 3rd generation returns 429 with clear message
- [ ] Quota warning email fires when crossing 80%
- [ ] Welcome email sent to new signups (check Resend dashboard)
- [ ] `/terms` and `/privacy` accessible without login
- [ ] Legal footer visible in dashboard
- [ ] `npm run build` passes clean
