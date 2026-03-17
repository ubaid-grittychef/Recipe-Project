import { createClient } from "@supabase/supabase-js";
import { Recipe } from "./types";
import { getProject } from "./store";
import { createLogger } from "./logger";

const log = createLogger("SitePublisher");

export async function publishRecipeToSite(
  projectId: string,
  recipe: Recipe
): Promise<void> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  if (!project.site_supabase_url || !project.site_supabase_service_key) {
    log.warn("Site Supabase not configured — skipping publish to site", {
      projectId,
      recipe: recipe.title,
    });
    return;
  }

  const siteDb = createClient(
    project.site_supabase_url,
    project.site_supabase_service_key
  );

  const siteRecipe = {
    id: recipe.id,
    keyword: recipe.keyword,
    restaurant_name: recipe.restaurant_name,
    title: recipe.title,
    slug: recipe.slug,
    description: recipe.description,
    intro_content: recipe.intro_content,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    total_time: recipe.total_time,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    nutrition: recipe.nutrition,
    tips: recipe.tips,
    variations: recipe.variations,
    faqs: recipe.faqs,
    rating: recipe.rating,
    seo_title: recipe.seo_title,
    seo_description: recipe.seo_description,
    focus_keywords: recipe.focus_keywords,
    image_search_term: recipe.image_search_term,
    image_url: recipe.image_url,
    word_count: recipe.word_count,
    category: recipe.category,
    status: recipe.status,
    created_at: recipe.created_at,
    published_at: recipe.published_at,
  };

  const { error } = await siteDb
    .from("recipes")
    .upsert(siteRecipe, { onConflict: "id" });

  if (error) {
    log.error("Failed to publish recipe to site", {
      projectId,
      recipe: recipe.title,
      errorCode: error.code,
      errorMsg: error.message,
    });
    throw new Error(`Site publish failed: ${error.message}`);
  }

  log.info("Recipe published to site", {
    projectId,
    recipe: recipe.title,
    slug: recipe.slug,
  });
}

export async function setupSiteSchema(projectId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const project = await getProject(projectId);
  if (!project) return { success: false, error: "Project not found" };

  if (!project.site_supabase_url || !project.site_supabase_service_key) {
    return {
      success: false,
      error: "Site Supabase URL and Service Key are required",
    };
  }

  const siteDb = createClient(
    project.site_supabase_url,
    project.site_supabase_service_key
  );

  const { error } = await siteDb.rpc("exec_sql", {
    query: RECIPES_TABLE_SQL,
  });

  if (error) {
    if (error.message?.includes("already exists")) {
      log.info("Site schema already exists", { projectId });
      return { success: true };
    }

    log.warn("RPC exec_sql not available, trying direct table check", {
      projectId,
    });

    const { error: checkError } = await siteDb
      .from("recipes")
      .select("id")
      .limit(1);

    if (checkError && checkError.code === "42P01") {
      return {
        success: false,
        error:
          "Table 'recipes' does not exist. Run the SQL migration in your site's Supabase SQL editor. Copy the SQL from the Setup Guide.",
      };
    }

    log.info("Site recipes table accessible", { projectId });
    return { success: true };
  }

  log.info("Site schema created", { projectId });
  return { success: true };
}

export async function resetSiteSchema(projectId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const project = await getProject(projectId);
  if (!project) return { success: false, error: "Project not found" };

  if (!project.site_supabase_url || !project.site_supabase_service_key) {
    return { success: false, error: "Site Supabase URL and Service Key are required" };
  }

  const siteDb = createClient(
    project.site_supabase_url,
    project.site_supabase_service_key
  );

  // Drop the table then recreate it fresh
  const { error: dropError } = await siteDb.rpc("exec_sql", {
    query: "DROP TABLE IF EXISTS recipes CASCADE;",
  });

  if (dropError) {
    log.warn("RPC exec_sql not available for drop — trying direct delete", { projectId });
    // Fallback: truncate all rows if we can't drop
    const { error: truncateError } = await siteDb
      .from("recipes")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (truncateError) {
      return { success: false, error: `Failed to clear table: ${truncateError.message}` };
    }
    log.info("Site recipes table truncated (fallback)", { projectId });
    return { success: true };
  }

  // Recreate the schema
  const { error: createError } = await siteDb.rpc("exec_sql", {
    query: RECIPES_TABLE_SQL,
  });

  if (createError) {
    return { success: false, error: `Table dropped but recreate failed: ${createError.message}` };
  }

  log.info("Site schema reset complete", { projectId });
  return { success: true };
}

export async function testSiteConnection(projectId: string): Promise<{
  connected: boolean;
  hasTable: boolean;
  recipeCount: number;
  error?: string;
}> {
  const project = await getProject(projectId);
  if (!project) return { connected: false, hasTable: false, recipeCount: 0, error: "Project not found" };

  if (!project.site_supabase_url || !project.site_supabase_anon_key) {
    return {
      connected: false,
      hasTable: false,
      recipeCount: 0,
      error: "Site Supabase URL and Anon Key are required",
    };
  }

  try {
    const siteDb = createClient(
      project.site_supabase_url,
      project.site_supabase_anon_key
    );

    const { data, error, count } = await siteDb
      .from("recipes")
      .select("id", { count: "exact" })
      .limit(1);

    if (error) {
      if (error.code === "42P01") {
        return {
          connected: true,
          hasTable: false,
          recipeCount: 0,
          error: "Connected but 'recipes' table does not exist. Run the SQL migration.",
        };
      }
      return {
        connected: true,
        hasTable: false,
        recipeCount: 0,
        error: error.message,
      };
    }

    return {
      connected: true,
      hasTable: true,
      recipeCount: count ?? data?.length ?? 0,
    };
  } catch (err) {
    return {
      connected: false,
      hasTable: false,
      recipeCount: 0,
      error: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

export const RECIPES_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  restaurant_name TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  intro_content TEXT NOT NULL DEFAULT '',
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,
  servings INTEGER DEFAULT 4,
  difficulty TEXT DEFAULT 'Medium',
  nutrition JSONB DEFAULT '{}',
  tips JSONB DEFAULT '[]',
  variations JSONB DEFAULT '[]',
  faqs JSONB DEFAULT '[]',
  rating NUMERIC(2,1) DEFAULT 4.8,
  seo_title TEXT,
  seo_description TEXT,
  focus_keywords JSONB DEFAULT '[]',
  image_search_term TEXT,
  image_url TEXT,
  word_count INTEGER DEFAULT 0,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

-- Add category column if table already existed without it
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT;

CREATE INDEX IF NOT EXISTS idx_recipes_slug ON recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON recipes(restaurant_name);
CREATE INDEX IF NOT EXISTS idx_recipes_published ON recipes(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON recipes;
CREATE POLICY "Public read access" ON recipes
  FOR SELECT TO anon, authenticated USING (status = 'published');

GRANT SELECT ON recipes TO anon, authenticated;
`;
