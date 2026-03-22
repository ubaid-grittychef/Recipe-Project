import fs from "fs";
import path from "path";
import { Project, Recipe, KeywordLog, GenerationLog, Deployment, Restaurant, BuiltInKeyword, Category, Profile } from "./types";
import { generateId } from "./utils";
import { createLogger } from "./logger";

const log = createLogger("Store");

/* ----------------------------------------------------------------
   globalThis persistence — survives Next.js HMR in dev mode.
   Also persists to .dev-data.json so data survives server restarts.
   In production with Supabase configured, this is never used.
   ---------------------------------------------------------------- */

interface DevStore {
  projects: Map<string, Project>;
  recipes: Map<string, Recipe>;
  keywordLogs: Map<string, KeywordLog>;
  generationLogs: Map<string, GenerationLog>;
  deployments: Map<string, Deployment>;
  restaurants: Map<string, Restaurant>;
  builtInKeywords: Map<string, BuiltInKeyword>;
  categories: Map<string, Category>;
}

const globalKey = "__recipe_factory_store__" as const;
const DEV_STORE_PATH = path.join(process.cwd(), ".dev-data.json");

// Debounced disk write — batches rapid mutations (e.g. during generation loops)
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSave() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    const g = globalThis as unknown as Record<string, DevStore>;
    const store = g[globalKey];
    if (!store) return;
    try {
      const data = {
        projects: [...store.projects.entries()],
        recipes: [...store.recipes.entries()],
        keywordLogs: [...store.keywordLogs.entries()],
        generationLogs: [...store.generationLogs.entries()],
        deployments: [...store.deployments.entries()],
        restaurants: [...store.restaurants.entries()],
        builtInKeywords: [...store.builtInKeywords.entries()],
        categories: [...store.categories.entries()],
      };
      fs.writeFileSync(DEV_STORE_PATH, JSON.stringify(data));
    } catch (err) {
      log.warn("Failed to persist dev store to disk", {}, err);
    }
  }, 300);
}

function getDevStore(): DevStore {
  const g = globalThis as unknown as Record<string, DevStore>;
  if (!g[globalKey]) {
    // Try loading from disk first (survives server restarts)
    try {
      if (fs.existsSync(DEV_STORE_PATH)) {
        const raw = JSON.parse(fs.readFileSync(DEV_STORE_PATH, "utf-8"));
        g[globalKey] = {
          projects: new Map(raw.projects ?? []),
          recipes: new Map(raw.recipes ?? []),
          keywordLogs: new Map(raw.keywordLogs ?? []),
          generationLogs: new Map(raw.generationLogs ?? []),
          deployments: new Map(raw.deployments ?? []),
          restaurants: new Map(raw.restaurants ?? []),
          builtInKeywords: new Map(raw.builtInKeywords ?? []),
          categories: new Map(raw.categories ?? []),
        };
        log.info("Loaded dev store from disk", { projects: g[globalKey].projects.size });
      }
    } catch (err) {
      log.warn("Failed to load dev store from disk — starting fresh", {}, err);
    }

    if (!g[globalKey]) {
      g[globalKey] = {
        projects: new Map(),
        recipes: new Map(),
        keywordLogs: new Map(),
        generationLogs: new Map(),
        deployments: new Map(),
        restaurants: new Map(),
        builtInKeywords: new Map(),
        categories: new Map(),
      };
      log.info("Initialized fresh in-memory dev store");
    }
  }
  return g[globalKey];
}

function hasSupabase(): boolean {
  // Require service role key for production — factory DB uses service_role RLS policy.
  // Anon key alone cannot read/write any factory tables.
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

const IMMUTABLE_FIELDS = new Set(["id", "created_at"]);

function stripImmutableFields(data: Partial<Project>): Partial<Project> {
  const cleaned = { ...data };
  for (const key of IMMUTABLE_FIELDS) {
    delete cleaned[key as keyof Project];
  }
  return cleaned;
}

// --- Projects ---

export async function getProjects(userId?: string): Promise<Project[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    let query = supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (userId) {
      query = query.eq("user_id", userId);
    }
    const { data, error } = await query;
    if (error) {
      log.error("Failed to fetch projects from Supabase", {}, error);
      throw error;
    }
    const projects = data ?? [];
    // Best-effort: compute draft_count via a single aggregate query
    try {
      const { data: draftData } = await supabase
        .from("recipes")
        .select("project_id")
        .eq("status", "draft");
      if (draftData) {
        const draftCounts: Record<string, number> = {};
        for (const row of draftData) {
          draftCounts[row.project_id] = (draftCounts[row.project_id] ?? 0) + 1;
        }
        for (const p of projects) {
          p.draft_count = draftCounts[p.id] ?? 0;
        }
      }
    } catch { /* non-critical */ }
    return projects;
  }
  const store = getDevStore();
  log.debug("Returning projects from dev store", { count: store.projects.size });
  const projects = Array.from(store.projects.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  // Compute draft_count in-memory
  const draftCounts: Record<string, number> = {};
  for (const recipe of store.recipes.values()) {
    if (recipe.status === "draft") {
      draftCounts[recipe.project_id] = (draftCounts[recipe.project_id] ?? 0) + 1;
    }
  }
  for (const p of projects) {
    p.draft_count = draftCounts[p.id] ?? 0;
  }
  return projects;
}

export async function getProject(id: string): Promise<Project | null> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      log.warn("Supabase getProject returned error", { id, code: error.code });
      return null;
    }
    return data;
  }
  return getDevStore().projects.get(id) ?? null;
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const now = new Date().toISOString();
  const project: Project = {
    id: generateId(),
    user_id: data.user_id ?? null,
    name: data.name ?? "",
    niche: data.niche ?? "",
    domain: data.domain ?? "",
    country: data.country ?? "US",
    language: data.language ?? "en",
    status: "setup",
    created_at: now,
    updated_at: now,
    logo_url: data.logo_url ?? null,
    primary_color: data.primary_color ?? "#f97316",
    font_preset: data.font_preset ?? "modern",
    tagline: data.tagline ?? "",
    meta_description: data.meta_description ?? "",
    author_name: data.author_name ?? "",
    target_audience: data.target_audience ?? "",
    site_category: data.site_category ?? "",
    content_tone: data.content_tone ?? "informative",
    sheet_url: data.sheet_url ?? "",
    sheet_keyword_column: data.sheet_keyword_column ?? "A",
    sheet_restaurant_column: data.sheet_restaurant_column ?? "B",
    sheet_status_column: data.sheet_status_column ?? "C",
    recipes_per_day: data.recipes_per_day ?? 5,
    generation_time: data.generation_time ?? "09:00",
    auto_pause_on_empty: data.auto_pause_on_empty ?? true,
    skimlinks_id: data.skimlinks_id ?? null,
    amazon_associate_id: data.amazon_associate_id ?? null,
    hellofresh_url: data.hellofresh_url ?? null,
    adsense_publisher_id: data.adsense_publisher_id ?? null,
    ga_id: data.ga_id ?? null,
    prompt_overrides: data.prompt_overrides ?? null,
    site_supabase_url: data.site_supabase_url ?? null,
    site_supabase_anon_key: data.site_supabase_anon_key ?? null,
    site_supabase_service_key: data.site_supabase_service_key ?? null,
    template_variant: data.template_variant ?? "default",
    vercel_token: data.vercel_token ?? null,
    vercel_project_id: data.vercel_project_id ?? null,
    vercel_deployment_url: data.vercel_deployment_url ?? null,
    deployment_status: "not_deployed",
    recipes_published: 0,
    keywords_remaining: 0,
    keywords_failed: 0,
    last_generation_at: null,
    next_scheduled_at: null,
    generation_status: "idle",
    publish_schedule_enabled: data.publish_schedule_enabled ?? false,
    publish_time: data.publish_time ?? "09:00",
    publish_per_day: data.publish_per_day ?? 3,
    publish_days: data.publish_days ?? "[1,2,3,4,5]",
    next_publish_at: null,
    last_published_at: null,
  };

  log.info("Creating project", { id: project.id, name: project.name });

  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: row, error } = await supabase
      .from("projects")
      .insert(project)
      .select()
      .single();
    if (error) {
      log.error("Supabase createProject failed", { name: project.name }, error);
      throw error;
    }
    return row;
  }

  getDevStore().projects.set(project.id, project);
  scheduleSave();
  return project;
}

export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<Project | null> {
  const safe = stripImmutableFields(data);

  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: row, error } = await supabase
      .from("projects")
      .update({ ...safe, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      log.error("Supabase updateProject failed", { id }, error);
      throw error;
    }
    log.info("Updated project", { id });
    return row;
  }

  const store = getDevStore();
  const existing = store.projects.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...safe, updated_at: new Date().toISOString() };
  store.projects.set(id, updated);
  scheduleSave();
  log.info("Updated project (dev store)", { id });
  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  log.info("Deleting project", { id });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
      log.error("Supabase deleteProject failed", { id }, error);
      throw error;
    }
    return true;
  }
  const result = getDevStore().projects.delete(id);
  scheduleSave();
  return result;
}

// --- Recipes ---

export async function getRecipesByProject(projectId: string): Promise<Recipe[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) {
      log.error("Supabase getRecipesByProject failed", { projectId }, error);
      throw error;
    }
    return data ?? [];
  }
  return Array.from(getDevStore().recipes.values())
    .filter((r) => r.project_id === projectId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getRecipeByKeyword(
  projectId: string,
  keyword: string
): Promise<Recipe | null> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("recipes")
      .select("id, keyword, title, status")
      .eq("project_id", projectId)
      .ilike("keyword", keyword.trim())
      .limit(1)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      return null; // treat lookup errors as "no duplicate"
    }
    return data as Recipe;
  }
  const normalized = keyword.trim().toLowerCase();
  return (
    Array.from(getDevStore().recipes.values()).find(
      (r) => r.project_id === projectId && r.keyword.trim().toLowerCase() === normalized
    ) ?? null
  );
}

export async function createRecipe(data: Recipe): Promise<Recipe> {
  log.info("Creating recipe", { id: data.id, title: data.title, project: data.project_id });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: row, error } = await supabase
      .from("recipes")
      .insert(data)
      .select()
      .single();
    if (error) {
      log.error("Supabase createRecipe failed", { title: data.title }, error);
      throw error;
    }
    return row;
  }
  getDevStore().recipes.set(data.id, data);
  scheduleSave();
  return data;
}

export async function getRecipe(recipeId: string): Promise<Recipe | null> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      log.error("Supabase getRecipe failed", { recipeId }, error);
      throw error;
    }
    return data;
  }
  return getDevStore().recipes.get(recipeId) ?? null;
}

export async function updateRecipe(
  recipeId: string,
  updates: Partial<Recipe>
): Promise<Recipe | null> {
  log.info("Updating recipe", { recipeId, fields: Object.keys(updates) });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("recipes")
      .update(updates)
      .eq("id", recipeId)
      .select()
      .single();
    if (error) {
      log.error("Supabase updateRecipe failed", { recipeId }, error);
      throw error;
    }
    return data;
  }
  const existing = getDevStore().recipes.get(recipeId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  getDevStore().recipes.set(recipeId, updated);
  scheduleSave();
  return updated;
}

export async function deleteRecipe(recipeId: string): Promise<boolean> {
  log.info("Deleting recipe", { recipeId });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", recipeId);
    if (error) {
      log.error("Supabase deleteRecipe failed", { recipeId }, error);
      throw error;
    }
    return true;
  }
  const result = getDevStore().recipes.delete(recipeId);
  scheduleSave();
  return result;
}

// --- Keyword Logs ---

export async function getKeywordLogs(projectId: string): Promise<KeywordLog[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("keyword_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("processed_at", { ascending: false });
    if (error) {
      log.error("Supabase getKeywordLogs failed", { projectId }, error);
      throw error;
    }
    return data ?? [];
  }
  return Array.from(getDevStore().keywordLogs.values())
    .filter((k) => k.project_id === projectId)
    .sort((a, b) => new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime());
}

export async function createKeywordLog(data: KeywordLog): Promise<KeywordLog> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: row, error } = await supabase
      .from("keyword_logs")
      .insert(data)
      .select()
      .single();
    if (error) {
      log.error("Supabase createKeywordLog failed", { keyword: data.keyword }, error);
      throw error;
    }
    return row;
  }
  getDevStore().keywordLogs.set(data.id, data);
  scheduleSave();
  return data;
}

// --- Generation Logs ---

export async function getGenerationLogs(projectId: string): Promise<GenerationLog[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("generation_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false });
    if (error) {
      log.error("Supabase getGenerationLogs failed", { projectId }, error);
      throw error;
    }
    return data ?? [];
  }
  return Array.from(getDevStore().generationLogs.values())
    .filter((g) => g.project_id === projectId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

export async function createGenerationLog(data: GenerationLog): Promise<GenerationLog> {
  log.info("Creating generation log", { id: data.id, project: data.project_id });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: row, error } = await supabase
      .from("generation_logs")
      .insert(data)
      .select()
      .single();
    if (error) {
      log.error("Supabase createGenerationLog failed", {}, error);
      throw error;
    }
    return row;
  }
  getDevStore().generationLogs.set(data.id, data);
  scheduleSave();
  return data;
}

export async function updateGenerationLog(id: string, data: Partial<GenerationLog>): Promise<void> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { error } = await supabase.from("generation_logs").update(data).eq("id", id);
    if (error) {
      log.error("Supabase updateGenerationLog failed", { id }, error);
      throw error;
    }
    return;
  }
  const store = getDevStore();
  const existing = store.generationLogs.get(id);
  if (existing) {
    store.generationLogs.set(id, { ...existing, ...data });
    scheduleSave();
  }
}

// --- Deployments ---

export async function getDeployments(projectId: string): Promise<Deployment[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("deployments")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) {
      log.error("Supabase getDeployments failed", { projectId }, error);
      throw error;
    }
    return data ?? [];
  }
  return Array.from(getDevStore().deployments.values())
    .filter((d) => d.project_id === projectId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function createDeployment(data: Deployment): Promise<Deployment> {
  log.info("Creating deployment", { id: data.id, project: data.project_id });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: row, error } = await supabase
      .from("deployments")
      .insert(data)
      .select()
      .single();
    if (error) {
      log.error("Supabase createDeployment failed", {}, error);
      throw error;
    }
    return row;
  }
  getDevStore().deployments.set(data.id, data);
  scheduleSave();
  return data;
}

export async function updateDeployment(id: string, data: Partial<Deployment>): Promise<void> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { error } = await supabase.from("deployments").update(data).eq("id", id);
    if (error) {
      log.error("Supabase updateDeployment failed", { id }, error);
      throw error;
    }
    return;
  }
  const store = getDevStore();
  const existing = store.deployments.get(id);
  if (existing) {
    store.deployments.set(id, { ...existing, ...data });
    scheduleSave();
  }
}

// --- Restaurants ---

export async function getRestaurantsByProject(projectId: string): Promise<Restaurant[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("project_id", projectId)
      .order("name", { ascending: true });
    if (error) {
      log.error("Supabase getRestaurantsByProject failed", { projectId }, error);
      throw error;
    }
    return data ?? [];
  }
  return Array.from(getDevStore().restaurants.values())
    .filter((r) => r.project_id === projectId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      log.error("Supabase getRestaurant failed", { id }, error);
      throw error;
    }
    return data;
  }
  return getDevStore().restaurants.get(id) ?? null;
}

export async function createRestaurant(data: Restaurant): Promise<Restaurant> {
  log.info("Creating restaurant", { id: data.id, name: data.name });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: row, error } = await supabase
      .from("restaurants")
      .insert(data)
      .select()
      .single();
    if (error) {
      log.error("Supabase createRestaurant failed", { name: data.name }, error);
      throw error;
    }
    return row;
  }
  getDevStore().restaurants.set(data.id, data);
  scheduleSave();
  return data;
}

export async function updateRestaurant(
  id: string,
  data: Partial<Omit<Restaurant, "id" | "project_id" | "created_at">>
): Promise<Restaurant | null> {
  log.info("Updating restaurant", { id });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: row, error } = await supabase
      .from("restaurants")
      .update(data)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      log.error("Supabase updateRestaurant failed", { id }, error);
      throw error;
    }
    return row;
  }
  const store = getDevStore();
  const existing = store.restaurants.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...data };
  store.restaurants.set(id, updated);
  scheduleSave();
  return updated;
}

export async function deleteRestaurant(id: string): Promise<boolean> {
  log.info("Deleting restaurant", { id });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) {
      log.error("Supabase deleteRestaurant failed", { id }, error);
      throw error;
    }
    return true;
  }
  const result = getDevStore().restaurants.delete(id);
  scheduleSave();
  return result;
}

// --- Restaurant helpers ---

export async function findOrCreateRestaurant(
  projectId: string,
  name: string
): Promise<Restaurant> {
  const { slugify } = await import("./utils");
  const slug = slugify(name);

  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    // Try find existing (case-insensitive)
    const { data: existing } = await supabase
      .from("restaurants")
      .select("*")
      .eq("project_id", projectId)
      .ilike("name", name)
      .limit(1)
      .single();
    if (existing) return existing;
    // Create new
    const now = new Date().toISOString();
    const rec: Restaurant = { id: generateId(), project_id: projectId, name, slug, description: null, logo_url: null, website_url: null, created_at: now };
    const { data: row, error } = await supabase.from("restaurants").insert(rec).select().single();
    if (error) throw error;
    return row;
  }

  const store = getDevStore();
  const normalized = name.trim().toLowerCase();
  const found = Array.from(store.restaurants.values()).find(
    (r) => r.project_id === projectId && r.name.trim().toLowerCase() === normalized
  );
  if (found) return found;
  const now = new Date().toISOString();
  const rec: Restaurant = { id: generateId(), project_id: projectId, name, slug, description: null, logo_url: null, website_url: null, created_at: now };
  store.restaurants.set(rec.id, rec);
  scheduleSave();
  log.info("Auto-created restaurant", { projectId, name });
  return rec;
}

// --- Categories ---

export async function getCategories(projectId: string): Promise<Category[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("project_id", projectId)
      .order("name", { ascending: true });
    if (error) { log.error("Supabase getCategories failed", { projectId }, error); throw error; }
    return data ?? [];
  }
  return Array.from(getDevStore().categories.values())
    .filter((c) => c.project_id === projectId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function findOrCreateCategory(
  projectId: string,
  name: string
): Promise<Category> {
  const { slugify } = await import("./utils");
  const slug = slugify(name);

  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data: existing } = await supabase
      .from("categories")
      .select("*")
      .eq("project_id", projectId)
      .ilike("name", name)
      .limit(1)
      .single();
    if (existing) {
      // Increment recipe_count
      await supabase.rpc("increment_category_count", { cat_id: existing.id }).throwOnError();
      return { ...existing, recipe_count: existing.recipe_count + 1 };
    }
    const now = new Date().toISOString();
    const rec: Category = { id: generateId(), project_id: projectId, name, slug, recipe_count: 1, created_at: now };
    const { data: row, error } = await supabase.from("categories").insert(rec).select().single();
    if (error) throw error;
    return row;
  }

  const store = getDevStore();
  const normalized = name.trim().toLowerCase();
  const found = Array.from(store.categories.values()).find(
    (c) => c.project_id === projectId && c.name.trim().toLowerCase() === normalized
  );
  if (found) {
    const updated = { ...found, recipe_count: found.recipe_count + 1 };
    store.categories.set(found.id, updated);
    scheduleSave();
    return updated;
  }
  const now = new Date().toISOString();
  const rec: Category = { id: generateId(), project_id: projectId, name, slug, recipe_count: 1, created_at: now };
  store.categories.set(rec.id, rec);
  scheduleSave();
  log.info("Auto-created category", { projectId, name });
  return rec;
}

// --- Built-in Keyword Queue ---

export async function getBuiltInKeywords(
  projectId: string,
  status?: BuiltInKeyword["status"]
): Promise<BuiltInKeyword[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    let query = supabase
      .from("builtin_keywords")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) {
      log.error("Supabase getBuiltInKeywords failed", { projectId }, error);
      throw error;
    }
    return data ?? [];
  }
  return Array.from(getDevStore().builtInKeywords.values())
    .filter((k) => k.project_id === projectId && (!status || k.status === status))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function createBuiltInKeywords(
  projectId: string,
  rows: Array<{ keyword: string; restaurant_name: string | null }>
): Promise<BuiltInKeyword[]> {
  const now = new Date().toISOString();
  const records: BuiltInKeyword[] = rows.map((r) => ({
    id: generateId(),
    project_id: projectId,
    keyword: r.keyword,
    restaurant_name: r.restaurant_name,
    status: "pending",
    error_reason: null,
    created_at: now,
    processed_at: null,
  }));

  log.info("Creating built-in keywords", { projectId, count: records.length });

  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("builtin_keywords")
      .insert(records)
      .select();
    if (error) {
      log.error("Supabase createBuiltInKeywords failed", { projectId }, error);
      throw new Error(error.message || JSON.stringify(error));
    }
    return data ?? [];
  }
  const store = getDevStore();
  for (const rec of records) {
    store.builtInKeywords.set(rec.id, rec);
  }
  scheduleSave();
  return records;
}

export async function updateBuiltInKeyword(
  id: string,
  updates: Partial<Omit<BuiltInKeyword, "id" | "project_id" | "created_at">>
): Promise<BuiltInKeyword | null> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("builtin_keywords")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      log.error("Supabase updateBuiltInKeyword failed", { id }, error);
      throw error;
    }
    return data;
  }
  const store = getDevStore();
  const existing = store.builtInKeywords.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  store.builtInKeywords.set(id, updated);
  scheduleSave();
  return updated;
}

export async function deleteBuiltInKeyword(id: string): Promise<boolean> {
  log.info("Deleting built-in keyword", { id });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { error } = await supabase.from("builtin_keywords").delete().eq("id", id);
    if (error) {
      log.error("Supabase deleteBuiltInKeyword failed", { id }, error);
      throw error;
    }
    return true;
  }
  const result = getDevStore().builtInKeywords.delete(id);
  scheduleSave();
  return result;
}

export async function deleteBuiltInKeywords(
  projectId: string,
  status?: BuiltInKeyword["status"]
): Promise<void> {
  log.info("Deleting built-in keywords", { projectId, status });
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    let query = supabase.from("builtin_keywords").delete().eq("project_id", projectId);
    if (status) query = query.eq("status", status);
    const { error } = await query;
    if (error) {
      log.error("Supabase deleteBuiltInKeywords failed", { projectId }, error);
      throw error;
    }
    return;
  }
  const store = getDevStore();
  for (const [key, kw] of store.builtInKeywords.entries()) {
    if (kw.project_id === projectId && (!status || kw.status === status)) {
      store.builtInKeywords.delete(key);
    }
  }
  scheduleSave();
}

// ── Profiles ─────────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!hasSupabase()) return null;
  const { supabase } = await import("./supabase");
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function getAllProfiles(): Promise<Profile[]> {
  if (!hasSupabase()) return [];
  const { supabase } = await import("./supabase");
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
  if (!hasSupabase()) return null;
  const { supabase } = await import("./supabase");
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
