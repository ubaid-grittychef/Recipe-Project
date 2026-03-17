# Auth + Subscription Gate Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace single-password FACTORY_PASSWORD auth with full Supabase Auth (email/password + Google + Microsoft OAuth), user profiles, subscription gating, and an admin user management panel.

**Architecture:** Supabase Auth handles identity. A `profiles` table stores role + subscription_status. Custom JWT claims embed role/status so middleware reads them from the token (zero DB calls). All routes protected by a new middleware that replaces the old cookie-hash system.

**Tech Stack:** Next.js 15 App Router, `@supabase/ssr`, Supabase Auth, TypeScript, Tailwind, Zod, lucide-react

> **Note:** No test suite configured (per CLAUDE.md). Skip test steps — verify by build + manual browser check.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Install | `package.json` | Add `@supabase/ssr` |
| Create | `src/lib/supabase/server.ts` | Server-side Supabase client |
| Create | `src/lib/supabase/client.ts` | Browser-side Supabase client |
| Replace | `src/middleware.ts` | Supabase session + JWT claims auth |
| Replace | `src/app/login/page.tsx` | Email/pass + Google + Microsoft |
| Create | `src/app/signup/page.tsx` | New user registration |
| Create | `src/app/auth/callback/route.ts` | OAuth + email confirm handler |
| Create | `src/app/auth/reset-password/page.tsx` | Password reset via token |
| Create | `src/app/auth/logout/route.ts` | Sign out handler |
| Create | `src/app/access-required/page.tsx` | Subscription gate page |
| Create | `src/app/admin/users/page.tsx` | Admin user management UI |
| Create | `src/app/api/admin/users/route.ts` | GET all users |
| Create | `src/app/api/admin/users/[userId]/route.ts` | PATCH user subscription/role |
| Modify | `src/lib/types.ts` | Add Profile, UserRole, SubscriptionStatus |
| Modify | `src/lib/store.ts` | Add profile CRUD functions |
| Modify | `factory-schema.sql` | Add profiles table + trigger + RLS |
| Modify | `supabase/factory-schema.sql` | Same as above |
| Delete | `src/app/api/auth/login/route.ts` | Old password-hash login — replaced |

---

## Chunk 1: Install + Supabase Client Helpers

### Task 1: Install @supabase/ssr

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project" && npm install @supabase/ssr
```
Expected: `@supabase/ssr` appears in `package.json` dependencies.

- [ ] **Step 2: Commit**
```bash
git add package.json package-lock.json
git commit -m "chore: install @supabase/ssr for Next.js 15 auth"
```

---

### Task 2: Create Supabase server client helper

**Files:**
- Create: `src/lib/supabase/server.ts`

- [ ] **Step 1: Create the file**
```typescript
// src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component — cookies can't be set, but session reads still work
          }
        },
      },
    }
  );
}
```

---

### Task 3: Create Supabase browser client helper

**Files:**
- Create: `src/lib/supabase/client.ts`

- [ ] **Step 1: Create the file**
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase SSR server + browser client helpers"
```

---

## Chunk 2: Database Schema

### Task 4: Add profiles table + trigger + RLS + JWT hook SQL

**Files:**
- Modify: `factory-schema.sql`
- Modify: `supabase/factory-schema.sql`

- [ ] **Step 1: Append to both factory-schema.sql files**

Add the following block at the end of both `factory-schema.sql` and `supabase/factory-schema.sql`:

```sql
-- ============================================================
-- PROFILES (auth users extension)
-- ============================================================

create table if not exists profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null,
  full_name            text not null default '',
  role                 text not null default 'user' check (role in ('admin', 'user')),
  subscription_status  text not null default 'inactive' check (subscription_status in ('active', 'inactive')),
  stripe_customer_id   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on profiles
  for each row execute procedure set_updated_at();

-- Auto-create profile on signup (security definer = runs as DB owner, bypasses RLS)
-- All profile creation goes through this trigger. Direct SDK inserts not supported.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS helpers (security definer to avoid policy recursion)
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_subscription_status()
returns text as $$
  select subscription_status from profiles where id = auth.uid();
$$ language sql security definer stable;

-- RLS policies
alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Admins can read all profiles" on profiles
  for select using (get_my_role() = 'admin');

create policy "Admins can update all profiles" on profiles
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- Projects: add user_id (run after creating profiles table)
alter table projects add column if not exists user_id uuid references profiles(id);

alter table projects enable row level security;

create policy "Users see own projects" on projects
  for all using (
    user_id = auth.uid() or get_my_role() = 'admin'
  );

-- ============================================================
-- JWT CUSTOM CLAIMS HOOK
-- Register in Supabase Dashboard → Auth → Hooks → Custom Access Token Hook
-- ============================================================
create or replace function custom_jwt_claims(event jsonb)
returns jsonb as $$
declare
  profile_row profiles;
begin
  select * into profile_row from profiles where id = (event->>'user_id')::uuid;
  return jsonb_set(
    event,
    '{claims}',
    (event->'claims') || jsonb_build_object(
      'user_role', coalesce(profile_row.role, 'user'),
      'subscription_status', coalesce(profile_row.subscription_status, 'inactive')
    )
  );
end;
$$ language plpgsql security definer;
```

- [ ] **Step 2: Commit**
```bash
git add factory-schema.sql supabase/factory-schema.sql
git commit -m "feat(db): add profiles table, RLS, JWT claims hook, user_id on projects"
```

> **Supabase Dashboard Setup (manual, one-time):**
> 1. Run the SQL above in Supabase SQL Editor
> 2. Go to Auth → Hooks → Custom Access Token Hook → select `custom_jwt_claims`
> 3. Go to Auth → Providers → enable Google (add Client ID + Secret)
> 4. Go to Auth → Providers → enable Azure/Microsoft (add Client ID + Secret)
> 5. Go to Auth → URL Configuration → set Site URL to `NEXT_PUBLIC_SITE_URL`
> 6. Add redirect URL: `{NEXT_PUBLIC_SITE_URL}/auth/callback`

---

## Chunk 3: Types + Store

### Task 5: Add Profile types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add to the top of types.ts (after existing type aliases)**

Open `src/lib/types.ts` and add after the existing type aliases (after line 4):

```typescript
// ── Auth / Profiles ──────────────────────────────────────────────────────────
export type UserRole = "admin" | "user";
export type SubscriptionStatus = "active" | "inactive";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Commit**
```bash
git add src/lib/types.ts
git commit -m "feat: add Profile, UserRole, SubscriptionStatus types"
```

---

### Task 6: Add profile CRUD to store

**Files:**
- Modify: `src/lib/store.ts`

- [ ] **Step 1: Add profile functions at the end of store.ts**

Append these functions to `src/lib/store.ts`:

```typescript
// ── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    log.error("Failed to fetch all profiles", {}, error);
    return [];
  }
  return (data ?? []) as Profile[];
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "role" | "subscription_status" | "full_name" | "stripe_customer_id">>
): Promise<Profile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) {
    log.error("Failed to update profile", { userId }, error);
    return null;
  }
  return data as Profile;
}
```

Also add `Profile` to the import from `./types` at the top of store.ts.

- [ ] **Step 2: Commit**
```bash
git add src/lib/store.ts
git commit -m "feat: add getProfile, getAllProfiles, updateProfile to store"
```

---

## Chunk 4: New Middleware

### Task 7: Replace middleware with Supabase Auth

**Files:**
- Replace: `src/middleware.ts`

- [ ] **Step 1: Fully replace src/middleware.ts**

```typescript
// src/middleware.ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that never require auth
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth/",
  "/access-required",
  "/api/auth/",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/cron/") // protected by CRON_SECRET separately
  ) {
    return NextResponse.next();
  }

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Build a response we can mutate cookies on (required by @supabase/ssr)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() — validates JWT signature server-side (getSession() does not)
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Read role + subscription from JWT custom claims (zero extra DB call)
  const userRole = (user.app_metadata?.user_role ?? "user") as string;
  const subStatus = (user.app_metadata?.subscription_status ?? "inactive") as string;

  // Admin bypasses subscription check
  if (userRole === "admin") {
    return response;
  }

  // Non-admins need active subscription for dashboard access
  // Allow /access-required itself to avoid redirect loop
  if (subStatus !== "active") {
    return NextResponse.redirect(new URL("/access-required", request.url));
  }

  // Block non-admins from /admin/* routes
  if (pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 2: Commit**
```bash
git add src/middleware.ts
git commit -m "feat: replace password-hash middleware with Supabase Auth JWT middleware"
```

---

## Chunk 5: Auth Pages

### Task 8: Auth callback route handler

**Files:**
- Create: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Create the file**
```typescript
// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // "next" param allows redirecting to the page user was trying to visit
  const next = searchParams.get("next") ?? "/";

  // Validate next is same-origin (prevent open redirect)
  const safeNext = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
```

---

### Task 9: Logout route handler

**Files:**
- Create: `src/app/auth/logout/route.ts`

- [ ] **Step 1: Create the file**
```typescript
// src/app/auth/logout/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return NextResponse.redirect(`${siteUrl}/login`);
}
```

---

### Task 10: Replace login page

**Files:**
- Replace: `src/app/login/page.tsx`

- [ ] **Step 1: Fully replace login page**
```tsx
// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChefHat, Mail, Lock, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const errorParam = searchParams.get("error");
  const message = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    errorParam === "auth_failed" ? "Authentication failed. Please try again." : ""
  );
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "azure" | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(next);
      router.refresh();
    }
  }

  async function handleOAuth(provider: "google" | "azure") {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address first"); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); } else { setResetSent(true); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
            <ChefHat className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Recipe Factory</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>

        {message === "password_updated" && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Password updated — please sign in.
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          {/* OAuth buttons */}
          <div className="space-y-2">
            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>

            <button
              onClick={() => handleOAuth("azure")}
              disabled={!!oauthLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {oauthLoading === "azure" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M11.5 2L2 7.5V16.5L11.5 22L21 16.5V7.5L11.5 2Z" fill="#00A4EF"/>
                  <path d="M11.5 2L2 7.5L11.5 13L21 7.5L11.5 2Z" fill="#0078D4"/>
                  <path d="M11.5 13L2 7.5V16.5L11.5 22V13Z" fill="#005BA1"/>
                  <path d="M11.5 13L21 7.5V16.5L11.5 22V13Z" fill="#0078D4"/>
                </svg>
              )}
              Continue with Microsoft
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {resetSent && <p className="text-sm text-green-600">Password reset email sent — check your inbox.</p>}

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition"
            >
              Forgot password?
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="font-medium text-brand-600 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
```

---

### Task 11: Create signup page

**Files:**
- Create: `src/app/signup/page.tsx`

- [ ] **Step 1: Create the file**
```tsx
// src/app/signup/page.tsx
"use client";

import { useState } from "react";
import { ChefHat, Mail, Lock, User, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "azure" | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createSupabaseBrowserClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) { setError(error.message); } else { setSuccess(true); }
  }

  async function handleOAuth(provider: "google" | "azure") {
    setOauthLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setOauthLoading(null); }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500">
            <Mail className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Check your email</h1>
          <p className="mt-2 text-sm text-slate-500">
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <p className="mt-6 text-sm text-slate-400">
            Already confirmed?{" "}
            <a href="/login" className="text-brand-600 hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
            <ChefHat className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Start building recipe websites</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {oauthLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth("azure")}
              disabled={!!oauthLoading || loading}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {oauthLoading === "azure" ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <path d="M11.5 2L2 7.5V16.5L11.5 22L21 16.5V7.5L11.5 2Z" fill="#00A4EF"/>
                  <path d="M11.5 2L2 7.5L11.5 13L21 7.5L11.5 2Z" fill="#0078D4"/>
                  <path d="M11.5 13L2 7.5V16.5L11.5 22V13Z" fill="#005BA1"/>
                  <path d="M11.5 13L21 7.5V16.5L11.5 22V13Z" fill="#0078D4"/>
                </svg>
              )}
              Continue with Microsoft
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSignup} className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Full name</span>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Smith" required
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" required minLength={8}
                  className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
            </label>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={loading || !!oauthLoading}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-brand-600 hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  );
}
```

---

### Task 12: Password reset page

**Files:**
- Create: `src/app/auth/reset-password/page.tsx`

- [ ] **Step 1: Create the file**
```tsx
// src/app/auth/reset-password/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Loader2, ChefHat } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    if (!tokenHash || type !== "recovery") {
      setVerifyError("Invalid or expired reset link. Please request a new one.");
      return;
    }
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error }) => {
      if (error) { setVerifyError("Link expired — please request a new password reset."); }
      else { setVerified(true); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); }
    else { router.push("/login?message=password_updated"); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500">
            <ChefHat className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Reset password</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {verifyError ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-red-500">{verifyError}</p>
              <a href="/login" className="text-sm text-brand-600 hover:underline">Back to sign in</a>
            </div>
          ) : !verified ? (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Verifying link…
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">New password</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" required minLength={8}
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Confirm password</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password" required
                    className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                </div>
              </label>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set New Password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
```

---

### Task 13: Access-required page

**Files:**
- Create: `src/app/access-required/page.tsx`

- [ ] **Step 1: Create the file**
```tsx
// src/app/access-required/page.tsx
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
        <div className="mt-3 mx-auto flex h-10 w-10 items-center justify-center">
          <ChefHat className="h-6 w-6 text-slate-400" />
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
```

- [ ] **Step 2: Commit all auth pages**
```bash
git add src/app/auth/ src/app/login/ src/app/signup/ src/app/access-required/
git commit -m "feat: add login, signup, reset-password, access-required, callback pages"
```

---

## Chunk 6: Admin Users Panel

### Task 14: Admin API — GET all users

**Files:**
- Create: `src/app/api/admin/users/route.ts`

- [ ] **Step 1: Create the file**
```typescript
// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProfiles, getRecipesByProject } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:AdminUsers");

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.user_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const profiles = await getAllProfiles();
    return NextResponse.json({ users: profiles });
  } catch (err) {
    log.error("Failed to fetch users", {}, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Task 15: Admin API — PATCH user

**Files:**
- Create: `src/app/api/admin/users/[userId]/route.ts`

- [ ] **Step 1: Create the file**
```typescript
// src/app/api/admin/users/[userId]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateProfile, getAllProfiles } from "@/lib/store";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:AdminUsers");

const PatchSchema = z.object({
  subscription_status: z.enum(["active", "inactive"]).optional(),
  role: z.enum(["admin", "user"]).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.app_metadata?.user_role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const updates = parsed.data;

    // Self-demotion guard
    if (userId === user.id && updates.role === "user") {
      return NextResponse.json({ error: "You cannot demote yourself" }, { status: 400 });
    }

    // Last-admin guard
    if (updates.role === "user") {
      const allProfiles = await getAllProfiles();
      const adminCount = allProfiles.filter((p) => p.role === "admin" && p.id !== userId).length;
      if (adminCount === 0) {
        return NextResponse.json({ error: "Cannot demote the last admin" }, { status: 400 });
      }
    }

    const updated = await updateProfile(userId, updates);
    if (!updated) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Immediate deactivation: revoke all sessions if subscription set to inactive
    if (updates.subscription_status === "inactive") {
      try {
        const adminClient = createSupabaseServerClient();
        // Use service role via supabase-js admin API
        const { createClient } = await import("@supabase/supabase-js");
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } }
        );
        await adminSupabase.auth.admin.signOut(userId);
      } catch (revokeErr) {
        log.warn("Failed to revoke user sessions", { userId }, revokeErr);
      }
    }

    log.info("Admin updated user", { adminId: user.id, targetUserId: userId, updates });
    return NextResponse.json({ user: updated });
  } catch (err) {
    log.error("Failed to update user", {}, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

### Task 16: Admin users page UI

**Files:**
- Create: `src/app/admin/users/page.tsx`

- [ ] **Step 1: Create the file**
```tsx
// src/app/admin/users/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAllProfiles } from "@/lib/store";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Double-check admin role server-side (defence in depth)
  if (!user || user.app_metadata?.user_role !== "admin") {
    redirect("/");
  }

  const profiles = await getAllProfiles();
  return <AdminUsersClient profiles={profiles} currentUserId={user.id} />;
}
```

- [ ] **Step 2: Create AdminUsersClient.tsx**
```tsx
// src/app/admin/users/AdminUsersClient.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield, User, CheckCircle, XCircle, Loader2 } from "lucide-react";
import type { Profile } from "@/lib/types";

interface Props {
  profiles: Profile[];
  currentUserId: string;
}

export default function AdminUsersClient({ profiles: initial, currentUserId }: Props) {
  const [profiles, setProfiles] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = profiles.filter(
    (p) => p.email.includes(search) || p.full_name.toLowerCase().includes(search.toLowerCase())
  );

  async function patch(userId: string, updates: Record<string, string>) {
    setLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Update failed"); return; }
      setProfiles((prev) => prev.map((p) => (p.id === userId ? data.user : p)));
      toast.success("User updated");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500 mt-1">{profiles.length} total users</p>
        </div>
        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-100 w-64"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">User</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Subscription</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Joined</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((profile) => (
              <tr key={profile.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{profile.full_name || "—"}</div>
                  <div className="text-slate-500 text-xs">{profile.email}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    profile.role === "admin"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-slate-100 text-slate-600"
                  }`}>
                    {profile.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                    {profile.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    profile.subscription_status === "active"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {profile.subscription_status === "active"
                      ? <CheckCircle className="h-3 w-3" />
                      : <XCircle className="h-3 w-3" />}
                    {profile.subscription_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {new Date(profile.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {loading === profile.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <button
                          onClick={() => patch(profile.id, {
                            subscription_status: profile.subscription_status === "active" ? "inactive" : "active",
                          })}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          {profile.subscription_status === "active" ? "Deactivate" : "Activate"}
                        </button>
                        {profile.id !== currentUserId && (
                          <button
                            onClick={() => patch(profile.id, {
                              role: profile.role === "admin" ? "user" : "admin",
                            })}
                            className="text-xs text-slate-500 hover:underline"
                          >
                            {profile.role === "admin" ? "Remove admin" : "Make admin"}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit admin panel**
```bash
git add src/app/admin/ src/app/api/admin/
git commit -m "feat: add admin users panel with subscription + role management"
```

---

## Chunk 7: Header Logout + Env Vars + Cleanup

### Task 17: Add sign-out to AppShell/Header

**Files:**
- Modify: `src/components/layout/Header.tsx` (or AppShell.tsx — check which has the user menu)

- [ ] **Step 1: Find and update the logout action**

In whichever component renders the top-right user menu / logout button, replace any existing `FACTORY_PASSWORD` logout logic with:

```tsx
// Add to the relevant component:
"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Inside the component:
const supabase = createSupabaseBrowserClient();
const router = useRouter();

async function handleSignOut() {
  await supabase.auth.signOut();
  router.push("/login");
}
```

Replace the existing logout button's `onClick` with `handleSignOut`.

- [ ] **Step 2: Add NEXT_PUBLIC_CONTACT_EMAIL to .env.local example**

Add to `.env.local` (if it exists) or document in README:
```
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_CONTACT_EMAIL=your@email.com
```

- [ ] **Step 3: Remove old auth API route**
```bash
rm "src/app/api/auth/login/route.ts"
```

- [ ] **Step 4: Final build check**
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project" && npx tsc --noEmit 2>&1 | head -40
```
Fix any type errors.

- [ ] **Step 5: Commit cleanup**
```bash
git add -A
git commit -m "feat: wire logout to Supabase signOut, remove old password auth route"
```

---

## Chunk 8: All 13 Audit Bug Fixes

> These are independent of auth. Execute all from `docs/superpowers/plans/2026-03-17-bug-fixes-audit.md`.
> Run them now as a separate parallel track.

- [ ] **Task 18: Execute all tasks from bug-fixes-audit plan**

See: `docs/superpowers/plans/2026-03-17-bug-fixes-audit.md` — Tasks 1–12.

---

## Final Verification

- [ ] `npm run build` passes with exit 0
- [ ] Visit `http://localhost:3000` → redirects to `/login`
- [ ] Login page shows email/pass + Google + Microsoft buttons
- [ ] Signup creates account → confirmation email flow
- [ ] `/access-required` shows contact email
- [ ] `/admin/users` visible only to admin role
- [ ] All 13 audit bugs confirmed fixed
