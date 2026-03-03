# Recipe Factory — Upgrade Roadmap

> Completed bug-fix sprint: all 10 CLAUDE.md bugs resolved + 8 new issues fixed.
> This document captures the next-level improvements for a production-grade, market-ready app.

---

## Tier 1 — High Impact, Relatively Fast (do first)

### 1. Inline Recipe Editor
**What:** Click any recipe in the recipes list → open a side drawer or full page editor where you can edit title, description, intro, ingredients, instructions, tips, FAQs, variations before publishing.

**Why:** Right now recipes can only be bulk-published as-is. If the AI produces a bad result, there's no way to fix it in the factory UI — you'd have to go into Supabase directly.

**Files to touch:**
- `src/app/projects/[id]/recipes/page.tsx` — add edit drawer/modal
- `src/app/api/projects/[id]/recipes/[recipeId]/route.ts` — new PUT route (check if exists)
- Reuse `UpdateRecipeSchema` from `validation.ts`

---

### 2. Auto-retry Failed Keywords Button
**What:** In the keywords log page, a "Retry Failed" button that calls the existing `resetKeywordsToPending()` in `sheets.ts` to reset all `failed` keyword rows back to `pending`, then optionally triggers a new generation run.

**Why:** Currently failed keywords are stuck — users have to manually edit the Google Sheet. The code already supports resetting, but there's no UI button.

**Files to touch:**
- `src/app/projects/[id]/keywords/page.tsx` — add "Retry Failed" button
- `src/app/api/projects/[id]/keywords/retry/route.ts` — new POST route calling `resetKeywordsToPending()`

---

### 3. Draft Recipe Banner on Project Dashboard
**What:** When there are draft recipes waiting to publish, show a prominent amber banner on the project detail page (not just the recipes sub-page) with a "Publish X Drafts" quick-action button.

**Why:** CLAUDE.md Warning 2 — the manual publish step is invisible to users. The recipes page has a badge but many users won't navigate there.

**Files to touch:**
- `src/app/projects/[id]/page.tsx` — add draft count banner between stat cards and quick links
- `src/app/api/projects/[id]/route.ts` — include `draft_count` in project GET response (join with recipes table)

---

### 4. Generation Progress — Real-time Log Stream
**What:** During a generation run, stream live log lines to the UI using Server-Sent Events (SSE) or polling. Show per-keyword status: "Generating 'Big Mac recipe'… done (1.2s)".

**Why:** The `GenerationProgressCard` polls for high-level counts, but users can't see which keyword is being processed or why one failed.

**Files to touch:**
- `src/app/api/projects/[id]/generate/progress/route.ts` — new SSE endpoint reading from a shared in-memory log buffer
- `src/components/GenerationProgressCard.tsx` — switch from polling to EventSource
- `src/lib/generator.ts` — write per-keyword events to the buffer

---

### 5. Keyword CSV / Paste Upload
**What:** A textarea in settings where users can paste keywords (one per line) and the factory writes them directly to the Google Sheet, setting their status to `pending`.

**Why:** Currently users must manually edit the Google Sheet. Many users won't know how to format it correctly.

**Files to touch:**
- `src/app/projects/[id]/settings/page.tsx` — add "Import Keywords" section
- `src/app/api/projects/[id]/keywords/import/route.ts` — new POST route that calls Sheets API to append rows

---

## Tier 2 — Significant Value, Medium Effort

### 6. Recipe Preview (Live Site Preview)
**What:** A "Preview" button on each recipe that renders a read-only HTML preview matching the deployed template's styling, using an iframe or a Next.js route that renders the template layout without a live Supabase connection.

**Why:** Users want to see what their recipe will look like before publishing.

**Files to touch:**
- `src/app/projects/[id]/recipes/[recipeId]/preview/page.tsx` — new page rendering template layout
- Requires either a server-side render using template components or an iframe pointing at the live site

---

### 7. Duplicate Keyword Detection
**What:** Before generating a recipe, check if a recipe with that keyword (or very similar slug) already exists in the factory DB. Skip duplicates and log a warning.

**Why:** If a user adds the same keyword twice to the sheet, two near-identical recipes get generated and one will fail with a slug collision error (caught but wasteful).

**Files to touch:**
- `src/lib/generator.ts` — add a `getRecipeByKeyword()` check before calling `generateRecipe()`
- `src/lib/store.ts` — add `getRecipeByKeyword(projectId, keyword)` query

---

### 8. Restaurant CMS — AI-generated Descriptions
**What:** In the Restaurants page, add an "Auto-generate description" button that calls OpenAI to write a short restaurant bio (50–100 words) using the restaurant name and niche context.

**Why:** Restaurant pages (`/restaurants/[slug]`) currently show whatever is stored in the DB. If the description field is empty, the page looks sparse.

**Files to touch:**
- `src/app/projects/[id]/restaurants/page.tsx` — add auto-generate button per restaurant
- `src/app/api/projects/[id]/restaurants/[restaurantId]/generate-bio/route.ts` — new POST route

---

### 9. Deployment Health Check on Project Dashboard
**What:** A status indicator on the project dashboard that pings the live Vercel URL and confirms the site is responding with HTTP 200. Show last-checked time and latency.

**Why:** A deployment can show "deployed" in the DB but the site might be erroring (e.g., missing env vars, Supabase connectivity issue at the site level). Users need a quick health signal.

**Files to touch:**
- `src/app/api/projects/[id]/health/route.ts` — new GET route that fetches the live URL
- `src/app/projects/[id]/page.tsx` — add health badge to deployment banner

---

### 10. Multi-project Keyword Sheet (Shared Sheet Support)
**What:** Allow a single Google Sheet to serve multiple projects by adding a "Project ID" or "Tag" column filter. Only rows matching the project's tag are fetched.

**Why:** Power users running 5+ niches don't want to maintain 5 separate sheets.

**Files to touch:**
- `src/lib/sheets.ts` — add optional `tagCol` + `tagValue` filter to `fetchPendingKeywords()`
- `src/lib/types.ts` + settings UI — add `sheet_tag_column` and `sheet_tag_value` fields

---

## Tier 3 — Advanced Features (post-MVP)

### 11. Analytics Integration
**What:** On the project dashboard, show a mini analytics panel pulling from Google Analytics Data API (GA4) — top 5 recipe pages by pageviews, total sessions, bounce rate.

**Requires:** GA4 API credentials per project, OAuth or service account with read access to the property.

---

### 12. Content Calendar View
**What:** A calendar-style view showing when recipes were/will be published. Drag-and-drop to reschedule `published_at` dates. Useful for SEO content planning.

---

### 13. A/B Title Testing
**What:** Generate two title variants per recipe using different prompts, track click-through rate from the recipe list page, automatically promote the winner after N impressions.

---

### 14. Sitemap Auto-submit
**What:** After a new recipe is published, automatically ping Google Search Console and Bing Webmaster Tools with the new URL via their indexing APIs.

---

### 15. Team / Multi-user Access
**What:** Replace single `FACTORY_PASSWORD` with a proper user table. Each user has email/password, assigned to one or more projects. Supports role: `owner`, `editor`, `viewer`.

---

## Quick Wins (< 30 min each)

| # | What | File | Effort |
|---|---|---|---|
| A | Show `category` field in recipe list table | `recipes/page.tsx` | 10 min |
| B | Add "Copy Project" button to create a new project with same settings | `projects/[id]/page.tsx` + API | 20 min |
| C | Add recipe count badge to project cards on the home dashboard | `src/app/page.tsx` | 15 min |
| D | Sort recipes by published_at, created_at, word_count (add sort dropdown) | `recipes/page.tsx` | 20 min |
| E | Warn when `PEXELS_API_KEY` is missing before generation starts | `generate/route.ts` | 5 min |
| F | Show estimated cost per generation run (token count × price) | `generator.ts` + `page.tsx` | 25 min |
| G | Add "Open Live Site" button to project dashboard (when deployed) | `projects/[id]/page.tsx` | 5 min |
| H | Validate Google Sheet connection before saving settings | `settings/page.tsx` — wire up existing `/api/sheets/validate` | 15 min |

---

## Implementation Order (Recommended)

```
Sprint 1 (highest ROI):
  1 → Inline Recipe Editor
  2 → Auto-retry Failed Keywords
  3 → Draft Banner on Dashboard
  H → Validate Sheet on Settings Save

Sprint 2 (core workflow polish):
  4 → Live Generation Log Stream
  5 → Keyword CSV Upload
  7 → Duplicate Keyword Detection
  G → "Open Live Site" button

Sprint 3 (content quality):
  6 → Recipe Preview
  8 → Restaurant AI Bios
  9 → Deployment Health Check
  E → Pexels key warning

Sprint 4 (power user features):
  10 → Multi-project Sheet
  11 → Analytics Integration
  12 → Content Calendar
```
