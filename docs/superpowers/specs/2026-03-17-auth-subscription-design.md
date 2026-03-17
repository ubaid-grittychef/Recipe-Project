# Auth + Subscription Gate — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Author:** Brainstorming session

---

## Goal

Replace the single-password `FACTORY_PASSWORD` auth with a full multi-user authentication system backed by Supabase Auth. Users must have an active subscription to access the dashboard. One super-admin account (the owner) bypasses the subscription check and has full access to all data.

---

## Auth Methods

Both login and signup pages support three entry points:

1. **Email + password** — standard credentials, email confirmation required on signup
2. **Google OAuth** — one-click via Supabase Google provider (PKCE flow)
3. **Microsoft OAuth** — one-click via Supabase Azure/Microsoft provider (PKCE flow)

Password reset is supported via email link (Supabase built-in).

---

## Data Model

### `profiles` table (new)

Stored in the factory Supabase database. Mirrors `auth.users` via a trigger on signup.

```sql
create table profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null,
  full_name            text not null default '',
  role                 text not null default 'user' check (role in ('admin', 'user')),
  subscription_status  text not null default 'inactive' check (subscription_status in ('active', 'inactive')),
  stripe_customer_id   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Auto-update updated_at on change
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

-- Auto-create profile on signup
-- NOTE: This function uses SECURITY DEFINER — it runs as the DB owner and bypasses RLS.
-- This is intentional: no INSERT RLS policy is needed on profiles because all profile
-- creation goes through this trigger. Direct SDK inserts to profiles are not supported.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### `projects` table (modified)

Add `user_id` foreign key so projects are scoped per user:

```sql
alter table projects add column user_id uuid references profiles(id);
-- Existing projects: assigned to admin user at migration time via one-time script
```

### RLS — Security Definer Helper

To avoid RLS infinite recursion (a policy on `profiles` cannot query `profiles` directly), use a `security definer` function that bypasses RLS:

```sql
-- Helper: returns current user's role without triggering RLS
create or replace function get_my_role()
returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Helper: returns current user's subscription_status without triggering RLS
create or replace function get_my_subscription_status()
returns text as $$
  select subscription_status from profiles where id = auth.uid();
$$ language sql security definer stable;
```

### RLS Policies

```sql
-- profiles: users read own row; admins read/update all (not delete — deletes via Auth cascade only)
alter table profiles enable row level security;

create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);

create policy "Admins can read all profiles" on profiles
  for select using (get_my_role() = 'admin');

create policy "Admins can update all profiles" on profiles
  for update using (get_my_role() = 'admin')
  with check (get_my_role() = 'admin');

-- projects: users see own; admins see all
alter table projects enable row level security;

create policy "Users see own projects" on projects
  for all using (
    user_id = auth.uid() or get_my_role() = 'admin'
  );
```

---

## Supabase Client Setup

Two helpers are required for Next.js 15 App Router:

**`src/lib/supabase/server.ts`** — used in Server Components, Route Handlers, and middleware:
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

**`src/lib/supabase/client.ts`** — used in Client Components:
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Middleware cookie adapter** — `src/middleware.ts` must use `createServerClient` with a mutable `response` cookie adapter (per `@supabase/ssr` docs) to refresh sessions on each request.

Package required: `npm install @supabase/ssr` (in addition to existing `@supabase/supabase-js`).

---

## JWT Custom Claims (Performance)

To avoid a DB round-trip on every request, `role` and `subscription_status` are embedded in the Supabase JWT as custom claims via a **Custom Access Token Hook** (Supabase Dashboard → Auth → Hooks → Custom Access Token Hook).

```sql
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

The hook writes custom claims into the JWT payload. In middleware, use `getUser()` (not `getSession()`) — Supabase docs explicitly warn that `getSession()` in server contexts does not re-validate the JWT signature and can be spoofed:

```typescript
// In src/middleware.ts — always use getUser() for server-side auth checks
const { data: { user } } = await supabase.auth.getUser();
if (!user) { /* redirect to /login */ }

// Custom claims written by the hook are available on user.app_metadata:
const userRole = (user.app_metadata?.user_role ?? 'user') as string;
const subStatus = (user.app_metadata?.subscription_status ?? 'inactive') as string;
```

`user.app_metadata` is the correct accessor for claims written by a Custom Access Token Hook in Supabase. Do NOT use manual `atob(jwt.split('.')[1])` decoding — the SDK exposes the decoded payload directly and handles Edge Runtime compatibility.

**Zero DB calls per request** — claims come from the JWT directly via `getUser()`.

**JWT staleness:** When an admin changes a user's `subscription_status` or `role`, the affected user's JWT retains the old values until their token refreshes (default 1-hour TTL). This is acceptable for subscription activation (users get access within 1 hour). For immediate deactivation (e.g. fraud), the admin must also call `supabase.auth.admin.signOut(userId)` (via service role) to invalidate all sessions immediately.

---

## Access Control Logic

Enforced in `src/middleware.ts` on every request to protected routes. Reads claims from JWT — no DB call.

```
Request comes in
  ├── Is /login, /signup, /auth/*, /access-required?  → pass through (public)
  ├── No Supabase session?                             → redirect /login
  ├── JWT claim user_role = 'admin'?                   → pass through (full access)
  ├── JWT claim subscription_status = 'active'?        → pass through
  └── Otherwise                                        → redirect /access-required
```

**Important:** `userId` for store queries must always be sourced from `supabase.auth.getUser()` server-side — never from request body, query params, or client-supplied headers. This prevents IDOR attacks.

---

## Pages

### `/login`
- Email + password form
- "Continue with Google" button → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`
- "Continue with Microsoft" button → same with `provider: 'azure'`
- "Forgot password?" link → `supabase.auth.resetPasswordForEmail(email, { redirectTo: '/auth/reset-password' })`
- "Don't have an account? Sign up" link
- Redirects to `/` on success

### `/signup`
- Full name field (stored in `raw_user_meta_data.full_name`, picked up by trigger)
- Email + password form
- "Continue with Google" / "Continue with Microsoft" buttons
- On submit: `supabase.auth.signUp()` → show "Check your email to confirm your account"
- "Already have an account? Log in" link

### `/auth/callback`
- **Route handler** (not a page): `src/app/auth/callback/route.ts`
- Handles OAuth redirects and email confirmation links
- Uses PKCE: calls `supabase.auth.exchangeCodeForSession(code)` — never implicit flow
- Validates `next` redirect param is same-origin before redirecting (prevents open redirect)
- On error: redirects to `/login?error=auth_failed`

### `/auth/reset-password`
- **Client Component** (requires browser-side Supabase client)
- On mount: calls `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` using `token_hash` from URL search params (awaited as `Promise` per Next.js 15)
- Shows new password + confirm fields only after OTP verified
- On submit: `supabase.auth.updateUser({ password: newPassword })` → redirect to `/login?message=password_updated`
- On OTP error: shows "Link expired — request a new one" with link to `/login`

### `/access-required`
- Server Component, standalone (no nav/sidebar)
- Message: "You need an active subscription to access the dashboard."
- Contact line: `Contact {process.env.CONTACT_EMAIL} to get access.`
- "Sign out" button (Client Component island calling `supabase.auth.signOut()` then redirecting to `/login`)

### Sign Out
- Available from the AppShell/Header for all authenticated users
- Client Component calls `supabase.auth.signOut()` then `router.push('/login')`
- Also available as a `POST /auth/logout` route handler for server-side sign-out:
  ```typescript
  // src/app/auth/logout/route.ts
  export async function POST() {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL!));
  }
  ```

### `/admin/users`
- **Both the page (Server Component) AND the API routes independently verify `role = 'admin'`** from the Supabase session — do not rely on middleware headers alone (defence in depth)
- Table: email, full name, role, subscription status, created at, project count
- Actions per row: toggle subscription (active ↔ inactive), toggle role (admin ↔ user)
- Search/filter by email or subscription status
- Pagination for large user lists

---

## API Routes

### `GET /api/admin/users`
- Server-side: call `supabase.auth.getUser()` and verify `profile.role === 'admin'` — return 403 if not
- Returns all profiles with project count

### `PATCH /api/admin/users/[userId]`
- Server-side admin role check (same as above)
- Body validated with Zod: `{ subscription_status?: z.enum(['active','inactive']), role?: z.enum(['admin','user']) }`
- **Self-demotion guard:** if `userId === currentUser.id` and body contains `role: 'user'`, return 400 with "You cannot demote yourself"
- **Last-admin guard:** before demoting any user, verify at least one other profile has `role = 'admin'`; return 400 if not
- **Immediate deactivation:** if `subscription_status` is set to `'inactive'`, also call `supabase.auth.admin.signOut(userId)` via service role to invalidate live sessions
- Updates `profiles` row via service role key
- Returns updated profile

---

## Store Changes (`src/lib/store.ts`)

All project-fetching functions accept an optional `{ userId, isAdmin }` context object:
- `isAdmin = true`: no `user_id` filter (sees all projects)
- `isAdmin = false`, `userId` set: adds `WHERE user_id = userId`
- `userId` must always come from `supabase.auth.getUser()` — never from client input

New store functions:
- `getProfile(userId: string)` → `Profile | null`
- `getAllProfiles()` → `Profile[]` (admin only — called only from admin API routes)
- `updateProfile(userId: string, data: Partial<Profile>)` → `Profile`

In-memory dev fallback: no user scoping (single-user dev mode, `isAdmin` defaults to `true`).

---

## New TypeScript Types (`src/lib/types.ts`)

```typescript
export type UserRole = 'admin' | 'user';
export type SubscriptionStatus = 'active' | 'inactive';

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

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (existing) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (existing) | Public anon key for client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (existing) | Server-side admin operations |
| `CONTACT_EMAIL` | Yes (new) | Shown on /access-required page |
| `NEXT_PUBLIC_SITE_URL` | Yes (new) | OAuth redirect base URL (e.g. https://yourdomain.com) |

OAuth credentials configured in Supabase Dashboard (not env vars):
- **Google**: Client ID + Secret from Google Cloud Console → Supabase Auth → Providers → Google
- **Microsoft**: Client ID + Secret from Azure App Registration → Supabase Auth → Providers → Azure

---

## Stripe Readiness

`profiles` table already has `stripe_customer_id`. When Stripe is added:

1. Add `stripe_subscription_id text` column to `profiles`
2. Create `/api/webhooks/stripe` handler that processes these events:
   - `checkout.session.completed` → set `subscription_status = 'active'`, store `stripe_customer_id`
   - `customer.subscription.created` → set `subscription_status = 'active'`
   - `customer.subscription.updated` → sync status
   - `customer.subscription.deleted` → set `subscription_status = 'inactive'`
   - `invoice.payment_failed` → set `subscription_status = 'inactive'`
3. JWT hook auto-refreshes on next login — no middleware changes needed

---

## Migration Strategy

1. Deploy new schema (profiles table, user_id on projects, RLS, JWT hook)
2. Admin creates their account via `/signup`
3. Run one-time migration script: `UPDATE projects SET user_id = '<admin-uuid>' WHERE user_id IS NULL`
4. Admin sets own `role = 'admin'` via Supabase dashboard or migration script
5. `FACTORY_PASSWORD` env var becomes unused — remove after confirming new auth works

---

## Out of Scope

- Public-facing marketing/pricing page (future)
- Stripe payment integration (future — readiness built in)
- Team/workspace sharing (future)
- Two-factor authentication (future)
- Session management / active sessions list (future)
- Audit log for admin actions (future — `updated_at` on profiles provides minimal trail)
