import { NextResponse } from "next/server";
import { createProject } from "@/lib/store";
import { requireProjectAccess } from "@/lib/auth-guard";
import { createLogger } from "@/lib/logger";

const log = createLogger("API:ProjectCopy");

/**
 * POST /api/projects/[id]/copy
 *
 * Duplicates a project, copying all settings (branding, SEO, schedule,
 * monetization, prompt overrides) but resetting all stats and deployment state.
 * The copy starts in "setup" status with "(copy)" appended to the name.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireProjectAccess(id);
  if (!auth.ok) return auth.response;
  const source = auth.project;

  log.info("Duplicating project", { sourceId: id, sourceName: source.name });

  const copy = await createProject({
    name: `${source.name} (copy)`,
    niche: source.niche,
    domain: "",
    country: source.country,
    language: source.language,
    logo_url: source.logo_url,
    primary_color: source.primary_color,
    font_preset: source.font_preset,
    tagline: source.tagline,
    meta_description: source.meta_description,
    author_name: source.author_name,
    target_audience: source.target_audience,
    site_category: source.site_category,
    content_tone: source.content_tone,
    prompt_overrides: source.prompt_overrides,
    sheet_url: source.sheet_url,
    sheet_keyword_column: source.sheet_keyword_column,
    sheet_restaurant_column: source.sheet_restaurant_column,
    sheet_status_column: source.sheet_status_column,
    recipes_per_day: source.recipes_per_day,
    generation_time: source.generation_time,
    auto_pause_on_empty: source.auto_pause_on_empty,
    skimlinks_id: source.skimlinks_id,
    amazon_associate_id: source.amazon_associate_id,
    hellofresh_url: source.hellofresh_url,
    adsense_publisher_id: source.adsense_publisher_id,
    ga_id: source.ga_id,
    // Site Supabase — copy credentials (user can change later)
    site_supabase_url: source.site_supabase_url,
    site_supabase_anon_key: source.site_supabase_anon_key,
    site_supabase_service_key: source.site_supabase_service_key,
    // Reset deployment and stats
    vercel_project_id: null,
    vercel_deployment_url: null,
    deployment_status: "not_deployed",
    recipes_published: 0,
    keywords_remaining: 0,
    keywords_failed: 0,
    last_generation_at: null,
    next_scheduled_at: null,
  });

  log.info("Project duplicated", { sourceId: id, newId: copy.id, name: copy.name });
  return NextResponse.json(copy, { status: 201 });
}
