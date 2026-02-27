# CLAUDE.md — Recipe Project: Audit, Lessons & Fix Plan

> This file documents a full end-to-end workflow audit of the Recipe-Project.
> It captures every confirmed bug, the root cause, and the exact fix required.
> Use this as the authoritative source of truth before making any changes.

---

## What This App Does (Quick Summary)

A multi-tenant SaaS that auto-generates recipe websites:
1. User creates a **Project** (niche, branding, SEO, monetization)
2. Links a **Google Sheet** containing keywords (one per row, with status column)
3. Scheduler (or manual trigger) runs generation: fetches pending keywords → calls OpenAI → fetches image → stores recipe as `draft`
4. User manually bulk-publishes drafts → syncs to the site's own Supabase instance
5. User deploys the `/template` site to Vercel → live recipe site reads from site's Supabase

---

## Confirmed Bugs — Ordered by Severity

---

### BUG 1 — CRITICAL: Session Cookie Not Validated (Auth Bypass)
**Files:** `src/middleware.ts`, `src/app/api/auth/login/route.ts`

**What happens:**
- Login creates token: `hashToken(factoryPassword + Date.now().toString())` — a random SHA256 every login
- Middleware only checks: `if (!session?.value)` — any truthy cookie value bypasses auth
- **An attacker can set `factory_session=anystring` in their browser and gain full access**

**Root cause:** The token is non-deterministic (includes `Date.now()`), so the middleware cannot re-verify it. No server-side session store exists.

**Fix:** Make the token deterministic — derive it from the password only:
```typescript
// login/route.ts — change line 30:
// BEFORE:
const token = hashToken(factoryPassword + Date.now().toString());
// AFTER:
const token = hashToken(factoryPassword);
```
```typescript
// middleware.ts — add validation after line 24:
// BEFORE:
const session = request.cookies.get(SESSION_COOKIE);
if (!session?.value) { ... }
// AFTER:
const session = request.cookies.get(SESSION_COOKIE);
if (!session?.value) { ... }
const expectedToken = crypto.createHash("sha256")
  .update(factoryPassword)
  .digest("hex");
if (session.value !== expectedToken) {
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}
```
**Note:** Add `import * as crypto from "crypto"` to middleware.ts.

---

### BUG 2 — CRITICAL: Scheduler Dies on Every Request (Vercel Serverless)
**File:** `src/instrumentation.ts`

**What happens:**
- `node-cron` is initialized via Next.js instrumentation
- On Vercel (serverless), each API route invocation spins up a fresh Node.js process
- The cron jobs start but the process exits after the response is sent
- **Cron jobs never actually fire in a serverless environment**

**Root cause:** `node-cron` requires a persistent long-running process. Vercel serverless functions are ephemeral.

**Fix Options (pick one):**
- **Option A (Recommended for Vercel):** Replace node-cron with [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs). Add a `vercel.json`:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/run-schedules",
        "schedule": "*/5 * * * *"
      }
    ]
  }
  ```
  Then create `/api/cron/run-schedules/route.ts` that calls `syncProjectSchedules()` and triggers generation for any projects whose `generation_time` has passed.
- **Option B (Self-hosted/VPS):** Keep node-cron but document that deployment must be a persistent Node.js server (e.g., Docker, Railway, Fly.io), NOT serverless Vercel.
- **Option C (Quick fix):** Add a `DEPLOYMENT_MODE=serverless|server` env var and document the limitation clearly.

---

### BUG 3 — CRITICAL: `publishRecipeToSite` Imported But Never Called in Generator
**File:** `src/lib/generator.ts` (line 11 vs. never used)

**What happens:**
- `publishRecipeToSite` is imported at line 11 of `generator.ts`
- The generator creates recipes as `status: "draft"` (line 136)
- It never calls `publishRecipeToSite()` — the import is dead code
- **Recipes are NEVER auto-published to the live site during generation**
- Users must manually click "Bulk Publish" for recipes to appear on the live site

**Root cause:** The publish step was removed from the generator loop but the import was left dangling.

**Fix:** Either:
- **Option A (Auto-publish):** After `await createRecipe(recipe)` (line 141), add:
  ```typescript
  // Publish to site Supabase if configured
  try {
    await publishRecipeToSite(projectId, { ...recipe, status: "published", published_at: new Date().toISOString() });
  } catch (pubErr) {
    log.warn("Failed to auto-publish to site (recipe saved as draft)", { title: recipe.title }, pubErr);
  }
  ```
  And change recipe status from `"draft"` to `"published"` on success.
- **Option B (Keep manual, remove dead import):** Remove line 11 import if manual-only publish is intentional. Document this clearly in the UI.

---

### BUG 4 — HIGH: `keywords_remaining` Calculation is Wrong
**File:** `src/lib/generator.ts` (line 207)

**What happens:**
- Current: `Math.max(0, totalPending - succeeded)`
- If you attempt 10 keywords and 3 fail: result = `totalPending - 7` (wrong — 3 failed keywords are also removed from pending in the sheet, marked as "failed")
- **The displayed "keywords remaining" count is inflated for every failed keyword**

**Root cause:** Both succeeded AND failed keywords are removed from the "pending" pool (they're marked as `done` or `failed` in the sheet). The subtraction should use total keywords attempted.

**Fix:**
```typescript
// generator.ts line 207 — BEFORE:
const remainingInSheet = Math.max(0, totalPending - succeeded);
// AFTER:
const remainingInSheet = Math.max(0, totalPending - keywords.length);
```

---

### BUG 5 — HIGH: Vercel Env Vars Fail on Redeploy (409 Conflict)
**File:** `src/lib/deployer.ts` (lines 96–107, `setVercelEnvVars`)

**What happens:**
- `setVercelEnvVars` calls `POST /v10/projects/{id}/env` with an array of env vars
- If the project already has these env vars (redeployment), the Vercel API returns **409 Conflict**
- The deployment fails with a cryptic error on every redeploy

**Root cause:** No upsert/update logic — always POSTs, never checks for existing vars.

**Fix:** Before posting, fetch existing env vars and delete the ones that will be updated:
```typescript
// In deployer.ts setVercelEnvVars, before the POST:
// 1. GET existing env vars
const existing = await vercelApi(`/v10/projects/${project.vercel_project_id}/env`) as { envs: Array<{ id: string; key: string }> };
// 2. Delete ones that overlap with what we're setting
const keysToSet = new Set(Object.keys(envVars));
for (const env of existing.envs ?? []) {
  if (keysToSet.has(env.key)) {
    await vercelApi(`/v10/projects/${project.vercel_project_id}/env/${env.id}`, "DELETE");
  }
}
// 3. Then POST the new values (existing POST code)
```

---

### BUG 6 — HIGH: Deployment Status Never Synced from Vercel
**File:** `src/app/api/projects/[id]/deployments/route.ts`

**What happens:**
- The `/deployments` endpoint returns whatever is in the local database
- If a deployment is `"building"`, it will show `"building"` forever unless something updates it
- `getDeploymentStatus()` exists in `deployer.ts` but is never called from the deployments route

**Fix:** In `deployments/route.ts`, after fetching from store, refresh any `"building"` deployments:
```typescript
// After: const deployments = await getDeployments(id);
// Add:
for (const dep of deployments) {
  if (dep.vercel_deployment_id && dep.status === "building") {
    try {
      const { getDeploymentStatus, updateDeploymentRecord } = await import("@/lib/deployer");
      const { state, url } = await getDeploymentStatus(dep.vercel_deployment_id);
      if (state === "READY" || state === "ERROR" || state === "CANCELED") {
        await updateDeployment(dep.id, {
          status: state === "READY" ? "ready" : "error",
          completed_at: new Date().toISOString(),
        });
        dep.status = state === "READY" ? "ready" : "error";
      }
    } catch { /* non-critical, return stale status */ }
  }
}
```

---

### BUG 7 — MEDIUM: No Retry Logic for External APIs
**Files:** `src/lib/openai.ts`, `src/lib/images.ts`, `src/lib/sheets.ts`, `src/lib/deployer.ts`

**What happens:**
- Any transient network error, rate limit (OpenAI 429), or API blip fails the entire generation run for that keyword
- No exponential backoff, no retries

**Fix:** Add a shared retry utility in `src/lib/utils.ts`:
```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("unreachable");
}
```
Wrap OpenAI call: `await withRetry(() => getClient().chat.completions.create(...))` etc.

---

### BUG 8 — MEDIUM: `console.error` Used Instead of Logger
**File:** `src/app/api/projects/[id]/deployments/route.ts` (line 13)

**What happens:**
- `console.error("Failed to fetch deployments:", error)` bypasses the structured logger
- Inconsistent with every other API route that uses `createLogger`

**Fix:**
```typescript
// deployments/route.ts
import { createLogger } from "@/lib/logger";
const log = createLogger("API:Deployments");
// Then replace console.error:
log.error("Failed to fetch deployments", { projectId: id }, error);
```

---

### BUG 9 — MEDIUM: `last_generation_at` Field Missing from Project Type
**File:** `src/lib/types.ts` vs `src/lib/generator.ts` (line 212)

**What happens:**
- `generator.ts` line 212 calls `updateProject(projectId, { last_generation_at: ... })`
- `last_generation_at` does not exist in the `Project` interface in `types.ts`
- TypeScript may catch this (strict mode), or silently ignore it at runtime

**Fix:** Add to `src/lib/types.ts` Project interface:
```typescript
last_generation_at?: string | null;
next_scheduled_at?: string | null;
```
(Also used in `scheduler.ts` line 72 and 90.)

---

### BUG 10 — LOW: Word Count Calculation Incomplete
**File:** `src/lib/generator.ts` (lines 101–106)

**What happens:**
- Word count is computed from: `intro_content + description + instructions + tips + faq answers`
- **Missing:** `variations` array words

**Fix:**
```typescript
// After faq line, add:
+ generated.variations.join(" ").split(/\s+/).length
```

---

### BUG 11 — LOW: `site_supabase_service_key` Missing from `RECIPES_TABLE_SQL` Policy
**File:** `src/lib/site-publisher.ts` (line 195+)

**What happens:**
- The RLS policy only allows `SELECT WHERE status = 'published'`
- But there is no INSERT/UPDATE policy
- `publishRecipeToSite` uses the service key, which bypasses RLS — this is correct
- **However**, `setupSiteSchema` creates the table but doesn't add a service-role INSERT policy, relying on the service key bypassing RLS. If RLS is in force with no write policy, anon key writes would silently fail. This is fine as designed (service key only writes), but should be explicitly documented.

---

## Architecture Warnings (Not Bugs, But Important)

### WARNING 1: Vercel Serverless vs. Persistent Scheduler
`node-cron` **requires a persistent process**. If the app is deployed to Vercel Functions (default), the scheduler WILL NOT WORK. Must either:
- Use Vercel Cron Jobs (HTTP-based, free on Pro/Team plans)
- Deploy to Railway, Fly.io, Render, or a VPS with a persistent Node.js process

### WARNING 2: Manual Publish Step is Invisible to Users
The workflow has a hidden manual step: after generation, recipes sit as `draft` in the factory DB. They only appear on the live site after "Bulk Publish". This is not obvious in the UI. Add a banner/alert on the recipes page saying: _"X draft recipes are ready to publish to your live site."_

### WARNING 3: Site Schema Setup Must Happen Before First Publish
If a user deploys to Vercel but hasn't clicked "Setup Database" in the project settings, the live site will 404 on all recipe pages. This step should be automated or prominently required before deployment.

### WARNING 4: Google Private Key Format
`GOOGLE_PRIVATE_KEY` must be stored with literal `\n` escape sequences (not real newlines). If the key has real newlines (e.g., from copy-paste in some shells), `key.replace(/\\n/g, "\n")` will silently produce an invalid key and all Sheets calls will fail with a cryptic auth error. Document this clearly in `.env.example`.

---

## The Complete Working Workflow (After Fixes)

```
1. CREATE PROJECT
   ├── Fill wizard (name, niche, branding, SEO, Google Sheet URL, column config)
   ├── Validate Sheet connection (POST /api/sheets/validate)
   ├── Configure site Supabase credentials
   └── Save → project stored in factory DB

2. SETUP SITE DATABASE
   ├── POST /api/projects/[id]/site → calls setupSiteSchema()
   └── Creates recipes table + RLS policy in site's Supabase

3. GENERATION (scheduled or manual)
   ├── Scheduler fires (cron or Vercel Cron) → POST /api/projects/[id]/generate
   ├── generator.ts:
   │   ├── fetchPendingKeywords() from Google Sheet
   │   ├── For each keyword:
   │   │   ├── generateRecipe() via OpenAI
   │   │   ├── fetchRecipeImage() via Pexels
   │   │   ├── createRecipe() in factory DB (status: draft)
   │   │   ├── [MISSING — BUG 3] publishRecipeToSite() to site DB
   │   │   └── markKeywordDone() in Google Sheet
   │   └── updateProject() with keywords_remaining (BUG 4 fix: use keywords.length)

4. PUBLISH (manual step — until BUG 3 is fixed)
   ├── POST /api/projects/[id]/recipes/bulk-publish
   ├── Updates recipe status to "published" in factory DB
   └── Calls publishRecipeToSite() → upserts to site Supabase

5. DEPLOY SITE
   ├── POST /api/projects/[id]/deploy
   ├── deployer.ts:
   │   ├── createVercelProject() if needed
   │   ├── setVercelEnvVars() — branding, Supabase keys, affiliate IDs (BUG 5 fix: upsert)
   │   ├── collectFiles() from /template directory
   │   ├── uploadFile() each file to Vercel
   │   └── POST /v13/deployments → initiates build
   └── Deployment status tracked, polled via GET /deployments (BUG 6 fix: sync from Vercel)

6. LIVE SITE
   └── Template site reads recipes from site Supabase → serves recipe pages
```

---

## Fix Priority Order

| Priority | Bug | File | Effort |
|---|---|---|---|
| 1 | Auth bypass (cookie not validated) | `middleware.ts`, `login/route.ts` | 15 min |
| 2 | keywords_remaining math | `generator.ts:207` | 2 min |
| 3 | Remove dead import / decide auto-publish | `generator.ts:11` | 30 min |
| 4 | Vercel env var 409 on redeploy | `deployer.ts` | 1 hr |
| 5 | Deployment status sync | `deployments/route.ts` | 30 min |
| 6 | Scheduler on serverless (architecture) | `instrumentation.ts` + `vercel.json` | 2–4 hrs |
| 7 | Add retry logic | `openai.ts`, `images.ts`, `sheets.ts` | 1 hr |
| 8 | `last_generation_at` missing from types | `types.ts` | 5 min |
| 9 | Replace `console.error` with logger | `deployments/route.ts` | 2 min |
| 10 | Word count fix | `generator.ts:106` | 2 min |

---

## Lessons Learned

### 1. Always validate session tokens, not just their existence
A cookie check of `if (!session?.value)` is NOT authentication — it's just a presence check. Always re-derive or look up the expected token value server-side.

### 2. Dead imports signal incomplete features
A function imported but never called (like `publishRecipeToSite` in `generator.ts`) is a red flag that a workflow step was planned but not wired up. Review every import.

### 3. node-cron requires a persistent process — document deployment requirements upfront
Never ship scheduler logic without a prominent note about runtime requirements. Serverless ≠ long-running.

### 4. Both success and failure paths consume keywords from the pending pool
When calculating "remaining", subtract ALL attempted keywords (the batch size), not just the successful ones. Failed keywords are also removed from the "pending" state in the sheet.

### 5. Vercel API env vars need upsert, not insert
Always handle 409 Conflict on resource creation APIs. Redeploys are a normal use case.

### 6. Verify the full end-to-end path before shipping any automation
The generator created recipes that would never appear on the live site without a separate manual step — a complete break in the automated flow. Trace every data-flow arrow to its destination before considering a feature complete.

### 7. Structured logging everywhere — no console.log/error escapes
One `console.error` in `deployments/route.ts` breaks the searchable, structured log pattern of the entire codebase. Enforce the logger utility from day one.

### 8. Type system gaps hide runtime bugs
`last_generation_at` and `next_scheduled_at` fields used throughout the app were missing from the `Project` TypeScript interface. TypeScript strict mode would catch this — enable it and fix the errors.

---

## Environment Variables Reference (Complete)

| Variable | Required | Used In | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | Yes | `openai.ts` | GPT-4o-mini |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | `sheets.ts` | Service account email |
| `GOOGLE_PRIVATE_KEY` | Yes | `sheets.ts` | Use `\n` not real newlines |
| `PEXELS_API_KEY` | Yes | `images.ts` | Warns if missing, images fail |
| `VERCEL_TOKEN` | Yes (for deploy) | `deployer.ts` | Throws if missing |
| `VERCEL_TEAM_ID` | Optional | `deployer.ts` | For team deployments |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (for prod) | `supabase.ts` | Falls back to in-memory if missing |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (for prod) | `supabase.ts` | |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (for prod) | API routes | Server-side only |
| `FACTORY_PASSWORD` | Optional | `middleware.ts` | No auth if not set |

---

## File Map — Where Things Live

| What you want to change | File |
|---|---|
| Generation workflow | `src/lib/generator.ts` |
| OpenAI prompt / model | `src/lib/openai.ts` |
| Google Sheets reading/writing | `src/lib/sheets.ts` |
| Pexels image search | `src/lib/images.ts` |
| Publishing to site Supabase | `src/lib/site-publisher.ts` |
| Vercel deployment logic | `src/lib/deployer.ts` |
| Cron schedule management | `src/lib/scheduler.ts` |
| Data types | `src/lib/types.ts` |
| Database CRUD | `src/lib/store.ts` |
| Auth middleware | `src/middleware.ts` |
| Scheduler startup | `src/instrumentation.ts` |
| Site SQL schema | `src/lib/site-publisher.ts` → `RECIPES_TABLE_SQL` |
| Factory DB schema | `factory-schema.sql` + `supabase/migrations/` |
| Template site (deployed to Vercel) | `/template/` |
