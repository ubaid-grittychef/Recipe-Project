# Bug Fixes — Full Audit Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 13 confirmed bugs and gaps found in the full codebase audit, ordered by severity.

**Architecture:** Surgical, file-by-file edits — no new abstractions, no refactors beyond the exact bug surface. Each task is a self-contained fix with a commit.

**Tech Stack:** Next.js 15 App Router, TypeScript, Zod, Supabase, Tailwind. No test suite (per CLAUDE.md).

> **Note on TDD:** No test suite is configured in this project (see CLAUDE.md). Skip test steps — apply fixes directly and verify by inspection/build.

---

## Chunk 1: Critical Security & Data Fixes

### Task 1: Add "v3" to template_variant Zod enum — validation.ts

**Files:**
- Modify: `src/lib/validation.ts:49`

**Problem:** `CreateProjectSchema` only accepts `["default", "premium"]` but `types.ts` declares `"v3"`. Any API call saving `template_variant: "v3"` fails Zod and the new template is unreachable.

- [ ] **Step 1: Edit validation.ts line 49**

Change:
```typescript
template_variant: z.enum(["default", "premium"]).optional().default("default"),
```
To:
```typescript
template_variant: z.enum(["default", "premium", "v3"]).optional().default("default"),
```

- [ ] **Step 2: Verify no other enum needs updating**

Search for any other hardcoded `["default", "premium"]` template enum:
```bash
grep -r '"default", "premium"' src/
```
If found in other files, apply the same addition.

- [ ] **Step 3: Commit**
```bash
git add src/lib/validation.ts
git commit -m "fix: add v3 to template_variant Zod enum — was silently rejecting new template"
```

---

### Task 2: Add ownership check to bulk-delete route

**Files:**
- Modify: `src/app/api/projects/[id]/recipes/bulk-delete/route.ts`
- Reference: `src/lib/store.ts` — `getRecipe(id)` returns `Recipe | null` with `project_id` field

**Problem:** Authenticated users can DELETE recipes from any project by sending foreign recipe IDs to their own project's bulk-delete endpoint. No ownership check exists.

- [ ] **Step 1: Add getRecipe import**

In `bulk-delete/route.ts` line 2, change:
```typescript
import { getProject, deleteRecipe } from "@/lib/store";
```
To:
```typescript
import { getProject, getRecipe, deleteRecipe } from "@/lib/store";
```

- [ ] **Step 2: Add ownership check inside the loop**

Change the loop (lines 34–42) from:
```typescript
    for (const id of ids) {
      try {
        await deleteRecipe(id);
        deleted++;
      } catch (err) {
        log.warn("Failed to delete recipe", { recipeId: id }, err);
        failed++;
      }
    }
```
To:
```typescript
    for (const id of ids) {
      try {
        const recipe = await getRecipe(id);
        if (!recipe || recipe.project_id !== projectId) {
          log.warn("Skipping recipe — not found or belongs to different project", { recipeId: id, projectId });
          failed++;
          continue;
        }
        await deleteRecipe(id);
        deleted++;
      } catch (err) {
        log.warn("Failed to delete recipe", { recipeId: id }, err);
        failed++;
      }
    }
```

- [ ] **Step 3: Commit**
```bash
git add src/app/api/projects/\[id\]/recipes/bulk-delete/route.ts
git commit -m "fix(security): verify recipe ownership before bulk delete — prevented cross-project deletion"
```

---

### Task 3: Validate status enum in refresh-all route

**Files:**
- Modify: `src/app/api/projects/[id]/recipes/refresh-all/route.ts:19`

**Problem:** `body.status` is an unchecked user-supplied string — any string is accepted silently. Should validate with the same `z.enum` pattern used elsewhere.

- [ ] **Step 1: Add zod import and validation**

Add after line 4 (`import { createLogger`):
```typescript
import { z } from "zod";
```

Change lines 19–25 from:
```typescript
    const body = await req.json().catch(() => ({})) as { status?: string };
    const recipes = await getRecipesByProject(id);

    // Only refresh recipes matching the requested status filter (default: drafts only)
    const targets = body.status
      ? recipes.filter((r) => r.status === body.status)
      : recipes.filter((r) => r.status === "draft");
```
To:
```typescript
    const rawBody = await req.json().catch(() => ({}));
    const bodyParsed = z.object({
      status: z.enum(["draft", "published"]).optional(),
    }).safeParse(rawBody);
    if (!bodyParsed.success) {
      return NextResponse.json({ error: "Invalid status — must be 'draft' or 'published'" }, { status: 400 });
    }
    const { status: statusFilter } = bodyParsed.data;
    const recipes = await getRecipesByProject(id);

    // Only refresh recipes matching the requested status filter (default: drafts only)
    const targets = statusFilter
      ? recipes.filter((r) => r.status === statusFilter)
      : recipes.filter((r) => r.status === "draft");
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/projects/\[id\]/recipes/refresh-all/route.ts
git commit -m "fix: validate status enum in refresh-all route — previously accepted arbitrary strings"
```

---

## Chunk 2: High-Priority Logic Fixes

### Task 4: Fix relink to include all recipes as internal link candidates

**Files:**
- Modify: `src/app/api/projects/[id]/recipes/relink/route.ts`

**Problem:** `injectInternalLinks` is called with `published` as both the source list and the candidates pool. Draft recipes are invisible to the link-injection pass, creating inconsistency between the factory DB content and the live site.

**Decision:** Use all recipes as the candidates pool (so links point to any recipe) but only update published recipes (since drafts aren't on the live site yet). This matches the generator's behavior.

- [ ] **Step 1: Update the loop to use all recipes as candidates**

Change lines 16–36 from:
```typescript
    const recipes = await getRecipesByProject(id);
    const published = recipes.filter((r) => r.status === "published");

    if (published.length === 0) {
      return NextResponse.json({ updated: 0, message: "No published recipes to relink" });
    }

    let updated = 0;

    for (const recipe of published) {
      const newIntro = injectInternalLinks(
        recipe.intro_content,
        published,
        recipe.slug
      );
```
To:
```typescript
    const recipes = await getRecipesByProject(id);
    const published = recipes.filter((r) => r.status === "published");

    if (published.length === 0) {
      return NextResponse.json({ updated: 0, message: "No published recipes to relink" });
    }

    let updated = 0;

    // Use ALL recipes as candidates so links can reference any recipe;
    // only update published recipes since drafts aren't live yet.
    for (const recipe of published) {
      const newIntro = injectInternalLinks(
        recipe.intro_content,
        recipes,
        recipe.slug
      );
```

- [ ] **Step 2: Update log and response to clarify**

Change line 38:
```typescript
    log.info("Internal relink completed", { projectId: id, total: published.length, updated });
```
To:
```typescript
    log.info("Internal relink completed", { projectId: id, totalPublished: published.length, totalCandidates: recipes.length, updated });
```

- [ ] **Step 3: Commit**
```bash
git add src/app/api/projects/\[id\]/recipes/relink/route.ts
git commit -m "fix: use all recipes as link candidates in relink — was excluding drafts from pool"
```

---

### Task 5: Fix deploy/reset to set "not_deployed" instead of "failed"

**Files:**
- Modify: `src/app/api/projects/[id]/deploy/reset/route.ts:14`

**Problem:** A user cancelling a stuck deployment gets their project permanently marked `"failed"`. The correct status is `"not_deployed"` — the user cancelled, not failed.

- [ ] **Step 1: Change the status value**

Change line 14 from:
```typescript
    await updateProject(id, { deployment_status: "failed" });
```
To:
```typescript
    await updateProject(id, { deployment_status: "not_deployed" });
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/projects/\[id\]/deploy/reset/route.ts
git commit -m "fix: deploy reset sets not_deployed status — was incorrectly marking as failed on cancel"
```

---

### Task 6: Fix double DB query in queue GET route

**Files:**
- Modify: `src/app/api/projects/[id]/queue/route.ts:16–22`

**Problem:** Every GET makes two full table scans: one for the filtered view and one for counts. Counts can be derived from the unfiltered set in one query.

- [ ] **Step 1: Fetch all keywords once, derive filtered and counts from it**

Change lines 15–23 from:
```typescript
  try {
    const keywords = await getBuiltInKeywords(id, status ?? undefined);
    const allKeywords = await getBuiltInKeywords(id);
    const counts = {
      pending: allKeywords.filter((k) => k.status === "pending").length,
      done: allKeywords.filter((k) => k.status === "done").length,
      failed: allKeywords.filter((k) => k.status === "failed").length,
    };
    return NextResponse.json({ keywords, counts });
```
To:
```typescript
  try {
    const allKeywords = await getBuiltInKeywords(id);
    const keywords = status ? allKeywords.filter((k) => k.status === status) : allKeywords;
    const counts = {
      pending: allKeywords.filter((k) => k.status === "pending").length,
      done: allKeywords.filter((k) => k.status === "done").length,
      failed: allKeywords.filter((k) => k.status === "failed").length,
    };
    return NextResponse.json({ keywords, counts });
```

- [ ] **Step 2: Remove unused getBuiltInKeywords import parameter** (no change needed — same import)

- [ ] **Step 3: Commit**
```bash
git add src/app/api/projects/\[id\]/queue/route.ts
git commit -m "perf: eliminate double DB query in queue GET — derive counts from single fetch"
```

---

## Chunk 3: Medium-Priority Fixes

### Task 7: Make generation_status required in Project interface

**Files:**
- Modify: `src/lib/types.ts:81`

**Problem:** `generation_status` is `NOT NULL DEFAULT 'idle'` in the SQL schema but optional in TypeScript. It's always present on reads — the type should reflect that.

- [ ] **Step 1: Change the field from optional to required**

Change line 81 from:
```typescript
  generation_status?: "idle" | "running" | "completed" | "failed";
```
To:
```typescript
  generation_status: "idle" | "running" | "completed" | "failed";
```

- [ ] **Step 2: Check for TypeScript breakage**

Run:
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project" && npx tsc --noEmit 2>&1 | head -30
```

If errors appear about `generation_status` being missing in object literals (e.g., in store.ts mock data), add `generation_status: "idle"` to those objects.

- [ ] **Step 3: Commit**
```bash
git add src/lib/types.ts
git commit -m "fix: make generation_status required in Project interface — matches NOT NULL DB column"
```

---

### Task 8: Remove deprecated Google sitemap ping

**Files:**
- Modify: `src/app/api/projects/[id]/sitemap/ping/route.ts:34–36`

**Problem:** Google officially removed sitemap ping support in January 2024. The URL returns errors on every bulk-publish, creating misleading log noise.

- [ ] **Step 1: Remove the Google entry from pingTargets**

Change lines 33–36 from:
```typescript
    const pingTargets = [
      { name: "Bing", url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
      { name: "Google", url: `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
    ];
```
To:
```typescript
    // Note: Google deprecated sitemap ping in Jan 2024 — Bing only.
    const pingTargets = [
      { name: "Bing", url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}` },
    ];
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/projects/\[id\]/sitemap/ping/route.ts
git commit -m "fix: remove deprecated Google sitemap ping (removed Jan 2024) — reduces log noise"
```

---

### Task 9: Fix bulk-publish TOCTOU counter race

**Files:**
- Modify: `src/app/api/projects/[id]/recipes/bulk-publish/route.ts:82–84`

**Problem:** `project.recipes_published` is fetched at the start of the request. If a concurrent generation run increments it during the loop, this overwrites that increment. Fix by re-fetching the project after the loop to get the current count.

- [ ] **Step 1: Replace stale snapshot increment with fresh re-fetch**

Change lines 81–84 from:
```typescript
    // Update the project's published counter
    await updateProject(projectId, {
      recipes_published: (project.recipes_published ?? 0) + published,
    });
```
To:
```typescript
    // Re-fetch project to get current counter (avoids TOCTOU race with concurrent generation)
    const freshProject = await getProject(projectId);
    await updateProject(projectId, {
      recipes_published: (freshProject?.recipes_published ?? project.recipes_published ?? 0) + published,
    });
```

- [ ] **Step 2: Commit**
```bash
git add src/app/api/projects/\[id\]/recipes/bulk-publish/route.ts
git commit -m "fix: re-fetch project before incrementing recipes_published — avoids TOCTOU race"
```

---

## Chunk 4: Low-Priority / Data Quality Fixes

### Task 10: Fix invalid ISO 8601 duration in template-v3 recipe schema.org

**Files:**
- Modify: `template-v3/src/app/recipe/[slug]/page.tsx:76–78`

**Problem:** `recipe.prep_time` is free text like `"30 mins"`. Prepending `PT` produces `"PT30 mins"` — not valid ISO 8601. Google Rich Results rejects this and recipe structured data fails validation.

**Fix strategy:** Write a helper that parses common time strings into `PTnM` / `PTnH` / `PTnHnM` format. If parsing fails, omit the field (undefined) rather than emit invalid data.

- [ ] **Step 1: Add a parseTimeToISO helper just above the recipeSchema object (line 66)**

Add this function before line 66:
```typescript
  // Converts "30 mins", "1 hour", "1h 20m", "45 minutes" → "PT30M", "PT1H", "PT1H20M"
  // Returns undefined if the string cannot be parsed (better to omit than emit invalid schema.org)
  function parseTimeToISO(raw?: string | null): string | undefined {
    if (!raw) return undefined;
    const s = raw.toLowerCase().replace(/\s+/g, " ").trim();
    // Match patterns like "1 hour 30 mins", "1h30m", "90 minutes", "30 min"
    const full = s.match(/^(?:(\d+)\s*h(?:ours?|r)?)?[\s,]*(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/);
    if (!full || (!full[1] && !full[2])) return undefined;
    const h = parseInt(full[1] ?? "0", 10);
    const m = parseInt(full[2] ?? "0", 10);
    if (h === 0 && m === 0) return undefined;
    if (h > 0 && m > 0) return `PT${h}H${m}M`;
    if (h > 0) return `PT${h}H`;
    return `PT${m}M`;
  }
```

- [ ] **Step 2: Use the helper in recipeSchema (lines 76–78)**

Change:
```typescript
    prepTime: recipe.prep_time ? `PT${recipe.prep_time}` : undefined,
    cookTime: recipe.cook_time ? `PT${recipe.cook_time}` : undefined,
    totalTime: recipe.total_time ? `PT${recipe.total_time}` : undefined,
```
To:
```typescript
    prepTime: parseTimeToISO(recipe.prep_time),
    cookTime: parseTimeToISO(recipe.cook_time),
    totalTime: parseTimeToISO(recipe.total_time),
```

- [ ] **Step 3: Verify template-v3 builds cleanly**
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project\template-v3" && npm run build 2>&1 | tail -20
```
Expected: exit 0, no type errors.

- [ ] **Step 4: Commit**
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project"
git add template-v3/src/app/recipe/\[slug\]/page.tsx
git commit -m "fix: parse time strings to valid ISO 8601 duration for schema.org — PT30 mins was invalid"
```

---

### Task 11: Document factory-secret behaviour in template-v3 data.ts

**Files:**
- Modify: `template-v3/src/lib/data.ts`

**Problem:** `x-factory-secret` is sent by the template but never validated server-side — it's security theatre. Since the factory API is already cookie-protected for the admin and the per-site credentials are the main security boundary, the correct fix is to document the architectural decision clearly so a future dev doesn't strip the header thinking it's dead code, nor trusts it as a security control.

> **Note:** Full server-side validation of this header would require a shared secret env var in both factory and template deployments. That's a larger auth architecture change beyond this audit scope. Document now; implement in a dedicated auth hardening sprint if needed.

- [ ] **Step 1: Add a comment to the fetchAllFromFactory function in data.ts**

In `template-v3/src/lib/data.ts`, find the line sending `x-factory-secret` and add a comment:
```typescript
// NOTE: x-factory-secret is sent for future server-side validation.
// Currently the factory API does not validate this header — the per-site
// Supabase credentials are the primary data isolation boundary.
// To enforce: add header check in /api/projects/[id]/recipes GET route
// against hashToken(FACTORY_PASSWORD) when no session cookie is present.
```

- [ ] **Step 2: Commit**
```bash
git add template-v3/src/lib/data.ts
git commit -m "docs: document x-factory-secret as unvalidated — note future enforcement path"
```

---

### Task 12: Final build verification

- [ ] **Step 1: Run main app TypeScript check**
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project" && npx tsc --noEmit 2>&1 | head -40
```
Fix any type errors surfaced by the `generation_status` change from Task 7.

- [ ] **Step 2: Run template-v3 build**
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project\template-v3" && npm run build 2>&1 | tail -20
```
Expected: exit 0.

- [ ] **Step 3: Done — tag the fixes**
```bash
cd "c:\Users\Admin\Documents\GitHub\Recipe-Project"
git log --oneline -12
```
Confirm all 11 fix commits are present.

---

## File Change Summary

| Task | File | Change |
|------|------|--------|
| 1 | `src/lib/validation.ts:49` | Add `"v3"` to template_variant enum |
| 2 | `src/app/api/projects/[id]/recipes/bulk-delete/route.ts` | Add `getRecipe` ownership check in loop |
| 3 | `src/app/api/projects/[id]/recipes/refresh-all/route.ts:19` | Zod enum validation for status body field |
| 4 | `src/app/api/projects/[id]/recipes/relink/route.ts:26` | Pass `recipes` (all) not `published` as candidates |
| 5 | `src/app/api/projects/[id]/deploy/reset/route.ts:14` | `"failed"` → `"not_deployed"` |
| 6 | `src/app/api/projects/[id]/queue/route.ts:16–17` | Single DB fetch, derive filter + counts client-side |
| 7 | `src/lib/types.ts:81` | `generation_status?` → required |
| 8 | `src/app/api/projects/[id]/sitemap/ping/route.ts:35` | Remove Google ping entry |
| 9 | `src/app/api/projects/[id]/recipes/bulk-publish/route.ts:82` | Re-fetch project before counter increment |
| 10 | `template-v3/src/app/recipe/[slug]/page.tsx:76–78` | `parseTimeToISO()` helper for ISO 8601 durations |
| 11 | `template-v3/src/lib/data.ts` | Document factory-secret architecture note |
| 12 | — | Build verification pass |
