# Dashboard & UI Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Recipe Factory dashboard from a cluttered multi-panel layout into a clean, intuitive command center that surfaces what matters, hides what doesn't, and makes every workflow 2 clicks or less.

**Architecture:** Server Components fetch data, Client Components handle interactivity. Each page gets a focused redesign — no rearchitecting the data layer, just upgrading UI/UX. New reusable components go in `src/components/ui/` and `src/components/dashboard/`.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, lucide-react, sonner toasts

---

## Problem Summary

| Problem | Fix |
|---------|-----|
| Admin users page uses JWT claims (broken after hook removal) | Read from DB in server component |
| No admin link visible in sidebar | Add admin section to sidebar (admin-only) |
| Project cards are small and info-dense | Larger cards, cleaner stats, visible actions |
| Main dashboard has no context/greeting | Global stats bar + greeting |
| Project overview has 14+ cards stacked vertically | Tab-based layout: Overview / Content / Operations |
| "Manage Users" only in header avatar dropdown | Move to sidebar admin section |
| No visual identity per project | Color-coded project header |
| Generation is buried | Prominent "Generate Now" CTA on project card |

---

## Files Modified / Created

| File | Change |
|------|--------|
| `src/app/admin/users/page.tsx` | Fix auth check — use DB not JWT claims |
| `src/components/layout/Sidebar.tsx` | Add admin section, user profile footer, cleaner groups |
| `src/components/dashboard/ProjectCard.tsx` | Larger card, color accent, bigger CTA, cleaner layout |
| `src/components/dashboard/DashboardClient.tsx` | Better stats bar, filter tabs, improved empty state |
| `src/components/projects/ProjectDashboard.tsx` | Tab layout — Overview / Content / Operations |
| `src/components/projects/ProjectHeader.tsx` | NEW — colored project header with key actions |
| `src/components/projects/OverviewTab.tsx` | NEW — pipeline + stats + activity (extracted) |
| `src/components/projects/ContentTab.tsx` | NEW — recipes + drafts + queue |
| `src/components/projects/OperationsTab.tsx` | NEW — deploy + logs + settings links |

---

## Task 1: Fix Admin Page Auth (5 min)

**Files:**
- Modify: `src/app/admin/users/page.tsx`

The page currently checks `app_metadata?.user_role === "admin"` which relied on the JWT hook we removed. Must query the profiles table instead.

- [ ] **Step 1: Fix the auth guard**

Replace the admin check in `src/app/admin/users/page.tsx`:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllProfiles } from "@/lib/store";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Read role from DB (not JWT claims — JWT hook was removed)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const profiles = await getAllProfiles();
  return <AdminUsersClient profiles={profiles} currentUserId={user.id} />;
}
```

- [ ] **Step 2: Commit**
```bash
git add src/app/admin/users/page.tsx
git commit -m "fix: admin page reads role from DB not JWT claims"
git push origin main
```

---

## Task 2: Sidebar — Add Admin Section + User Profile Footer

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

The sidebar needs: (a) an admin-only "Admin" section with "Manage Users", (b) user profile shown at bottom with name/email, (c) cleaner visual grouping.

Since the sidebar is a client component, we pass `userRole` and `userEmail` as props from `AppShell`, which gets them from the server.

- [ ] **Step 1: Update AppShell to fetch user profile and pass to Sidebar**

Modify `src/components/layout/AppShell.tsx` — convert to async server component, fetch profile, pass to Sidebar:

```typescript
// src/components/layout/AppShell.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import AppShellClient from "./AppShellClient";

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRole = "user";
  let userEmail = "";
  let userFullName = "";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email, full_name")
      .eq("id", user.id)
      .single();
    userRole = profile?.role ?? "user";
    userEmail = profile?.email ?? user.email ?? "";
    userFullName = profile?.full_name ?? "";
  }

  return (
    <AppShellClient userRole={userRole} userEmail={userEmail} userFullName={userFullName}>
      {children}
    </AppShellClient>
  );
}
```

- [ ] **Step 2: Create AppShellClient (the old AppShell logic, now receives props)**

Create `src/components/layout/AppShellClient.tsx`:

```typescript
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface Props {
  children: React.ReactNode;
  userRole: string;
  userEmail: string;
  userFullName: string;
}

export default function AppShellClient({ children, userRole, userEmail, userFullName }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = pathname === "/login" || pathname === "/signup" ||
    pathname.startsWith("/auth/") || pathname === "/access-required";

  if (isAuthPage) return <>{children}</>;

  return (
    <>
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        userRole={userRole}
        userEmail={userEmail}
        userFullName={userFullName}
      />
      <div className="lg:pl-64">
        <Header onMenuToggle={() => setMobileOpen(true)} userRole={userRole} />
        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Update Sidebar to accept and use userRole/userEmail/userFullName**

Key changes to `src/components/layout/Sidebar.tsx`:
- Accept `userRole`, `userEmail`, `userFullName` props
- Add admin section with "Manage Users" (only if `userRole === "admin"`)
- Replace generic footer card with actual user name/email
- Fix logout to use Supabase signout properly

```typescript
interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
  userRole: string;
  userEmail: string;
  userFullName: string;
}
```

Footer section (replace the current generic footer):
```tsx
<div className="border-t border-slate-100 p-3 space-y-1">
  {/* Admin section */}
  {userRole === "admin" && (
    <div className="mb-2">
      <p className="section-title px-3 mb-1">Admin</p>
      <Link href="/admin/users" onClick={onClose} className={cn("sidebar-link", pathname.startsWith("/admin") && "active")}>
        <Users className="h-4 w-4 shrink-0" />
        Manage Users
      </Link>
    </div>
  )}

  {/* User profile */}
  <div className="flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5">
    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 shrink-0">
      <span className="text-xs font-bold text-brand-600">
        {(userFullName || userEmail).charAt(0).toUpperCase()}
      </span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-slate-700 truncate">{userFullName || "My Account"}</p>
      <p className="text-[10px] text-slate-400 truncate">{userEmail}</p>
    </div>
    {userRole === "admin" && (
      <span className="shrink-0 rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-600 uppercase">Admin</span>
    )}
  </div>

  <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800">
    <LogOut className="h-4 w-4" />
    Sign Out
  </button>
</div>
```

- [ ] **Step 4: Update Header to accept userRole (hide "Manage Users" from dropdown if already in sidebar)**

Simplify the header avatar dropdown — remove "Manage Users" from it since it's now in the sidebar. Keep only "Sign Out" in the dropdown.

- [ ] **Step 5: Commit**
```bash
git add src/components/layout/
git commit -m "feat: sidebar shows user profile, admin section, role-aware nav"
git push origin main
```

---

## Task 3: Better Project Cards

**Files:**
- Modify: `src/components/dashboard/ProjectCard.tsx`

Make cards larger, more visual, with a color-coded top bar and a prominent "Manage →" CTA.

- [ ] **Step 1: Redesign ProjectCard**

Key visual changes:
- Taller card with breathing room
- Color-coded left border (4px, uses `primary_color`)
- Top section: logo + name + niche + status badge
- Middle section: 3 stat pills (Recipes / Pending / Rate) — larger, cleaner
- Bottom section: deployment status left, last gen right
- Single "Manage →" button spans full width at bottom
- "Generate" quick-action button visible on hover

```tsx
// Key structure change — left color border instead of top bar:
<div
  className={cn(
    "group relative flex flex-col rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 overflow-hidden",
    isSelected ? "border-brand-400 ring-2 ring-brand-100" : "border-slate-200"
  )}
  style={{ borderLeftColor: project.primary_color ?? "#f97316", borderLeftWidth: "4px" }}
>
```

Stats section — bigger and cleaner:
```tsx
<div className="grid grid-cols-3 gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100">
  {[
    { label: "Recipes", value: project.recipes_published },
    { label: "Pending", value: project.keywords_remaining },
    { label: "Rate", value: successRate != null ? `${successRate}%` : "—" },
  ].map(({ label, value }) => (
    <div key={label} className="text-center">
      <p className="text-lg font-bold text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{label}</p>
    </div>
  ))}
</div>
```

- [ ] **Step 2: Commit**
```bash
git add src/components/dashboard/ProjectCard.tsx
git commit -m "feat: redesign project cards with color accent, cleaner stats, better CTA"
git push origin main
```

---

## Task 4: Main Dashboard — Better Stats + Layout

**Files:**
- Modify: `src/components/dashboard/DashboardClient.tsx`

Changes:
- Stats bar uses icon+color cards (not just numbers)
- Add status filter tabs: All / Active / Paused / Setup
- Better empty state with illustration-style prompt
- Remove "Select all" from toolbar (move to bulk bar, shown only when items selected)

- [ ] **Step 1: Add status filter tabs to DashboardClient**

```typescript
const [filter, setFilter] = useState<"all" | "active" | "paused" | "setup">("all");

const filtered = projects.filter((p) => {
  const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.niche.toLowerCase().includes(search.toLowerCase());
  const matchesFilter = filter === "all" || p.status === filter;
  return matchesSearch && matchesFilter;
});
```

Filter tabs UI:
```tsx
<div className="flex gap-1 rounded-lg bg-slate-100 p-1">
  {(["all", "active", "paused", "setup"] as const).map((f) => (
    <button
      key={f}
      onClick={() => setFilter(f)}
      className={cn(
        "rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-all",
        filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      )}
    >
      {f === "all" ? `All (${projects.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${projects.filter(p => p.status === f).length})`}
    </button>
  ))}
</div>
```

- [ ] **Step 2: Improve stats bar icons + colors**

Replace plain number cards with colored icon cards:
```tsx
const stats = [
  { label: "Total Projects", value: projects.length, icon: LayoutDashboard, color: "blue" },
  { label: "Live Sites", value: projects.filter(p => p.deployment_status === "deployed").length, icon: Globe, color: "green" },
  { label: "Recipes Published", value: projects.reduce((s, p) => s + p.recipes_published, 0).toLocaleString(), icon: FileText, color: "orange" },
  { label: "Pending Keywords", value: projects.reduce((s, p) => s + p.keywords_remaining, 0).toLocaleString(), icon: ListChecks, color: "purple" },
];
```

- [ ] **Step 3: Commit**
```bash
git add src/components/dashboard/DashboardClient.tsx
git commit -m "feat: dashboard filter tabs, colored stats cards, cleaner toolbar"
git push origin main
```

---

## Task 5: Project Overview — Tab Layout

**Files:**
- Modify: `src/components/projects/ProjectDashboard.tsx`
- Create: `src/components/projects/ProjectHeader.tsx`
- Create: `src/components/projects/OverviewTab.tsx`
- Create: `src/components/projects/ContentTab.tsx`
- Create: `src/components/projects/OperationsTab.tsx`

The 14-card vertical stack becomes a 3-tab layout:

| Tab | Contents |
|-----|----------|
| **Overview** | Setup checklist + Pipeline bar + Stats grid + Activity feed |
| **Content** | Draft banner + Quick generate + Recipes summary + Queue status |
| **Operations** | Deployment card + Site health + Logs + Settings links |

- [ ] **Step 1: Create ProjectHeader component**

`src/components/projects/ProjectHeader.tsx` — colored banner with project identity + top actions:

```tsx
// Shows: colored banner using primary_color, project logo/initials,
// name + niche, status badge, and 4 action buttons:
// [View Site] [Generate] [Publish Drafts] [Settings]
// Props: project, draftCount, generating, onGenerate, onPublish
```

- [ ] **Step 2: Create tab components (extract from ProjectDashboard)**

`OverviewTab.tsx` — receives: project, queueCounts, generationRunning
`ContentTab.tsx` — receives: project, draftCount, queueCounts, generating, onGenerate, onPublish
`OperationsTab.tsx` — receives: project, healthCheck, onHealthCheck, pingResult, onPingSitemap

- [ ] **Step 3: Update ProjectDashboard to use tab layout**

```tsx
const [tab, setTab] = useState<"overview" | "content" | "operations">("overview");

// Tab bar:
<div className="flex gap-0 border-b border-slate-200 mb-6">
  {[
    { key: "overview", label: "Overview", icon: LayoutDashboard },
    { key: "content", label: "Content", icon: FileText },
    { key: "operations", label: "Operations", icon: Settings2 },
  ].map(({ key, label, icon: Icon }) => (
    <button
      key={key}
      onClick={() => setTab(key as typeof tab)}
      className={cn(
        "flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors",
        tab === key
          ? "border-brand-500 text-brand-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Commit**
```bash
git add src/components/projects/
git commit -m "feat: project overview tab layout - Overview/Content/Operations"
git push origin main
```

---

## Task 6: Polish — Colors, Typography, Empty States

**Files:**
- Modify: `src/app/globals.css` (if needed)
- Modify: `src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Improve EmptyState component for main dashboard**

When no projects: show a welcoming card with the "New Project" CTA prominently:
```tsx
<div className="flex flex-col items-center justify-center py-24 text-center">
  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 mb-4">
    <ChefHat className="h-10 w-10 text-brand-400" />
  </div>
  <h2 className="text-xl font-bold text-slate-900">Build your first recipe site</h2>
  <p className="mt-2 text-sm text-slate-500 max-w-sm">
    Create a project, add keywords, and let AI generate hundreds of SEO-optimized recipe pages.
  </p>
  <Link href="/projects/new" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 transition">
    <PlusCircle className="h-4 w-4" />
    Create your first project
  </Link>
</div>
```

- [ ] **Step 2: Commit**
```bash
git add src/components/ui/EmptyState.tsx
git commit -m "feat: improved empty state for main dashboard"
git push origin main
```

---

## Execution Order

1. Task 1 (admin fix) — unblocks `/admin/users` page ✅ quick win
2. Task 2 (sidebar) — unlocks user identity + admin nav
3. Task 3 (project cards) — biggest visual improvement on main page
4. Task 4 (dashboard stats + filter) — completes main page redesign
5. Task 5 (project overview tabs) — biggest complexity, do last
6. Task 6 (polish) — finishing touches
