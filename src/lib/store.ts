import { Project, Recipe, KeywordLog, GenerationLog, Deployment, Restaurant } from "./types";
import { generateId } from "./utils";
import { createLogger } from "./logger";

const log = createLogger("Store");

/* ----------------------------------------------------------------
   globalThis persistence — survives Next.js HMR in dev mode.
   In production with Supabase configured, this is never used.
   ---------------------------------------------------------------- */

interface DevStore {
  projects: Map<string, Project>;
  recipes: Map<string, Recipe>;
  keywordLogs: Map<string, KeywordLog>;
  generationLogs: Map<string, GenerationLog>;
  deployments: Map<string, Deployment>;
  restaurants: Map<string, Restaurant>;
}

const globalKey = "__recipe_factory_store__" as const;

function getDevStore(): DevStore {
  const g = globalThis as unknown as Record<string, DevStore>;
  if (!g[globalKey]) {
    g[globalKey] = {
      projects: new Map(),
      recipes: new Map(),
      keywordLogs: new Map(),
      generationLogs: new Map(),
      deployments: new Map(),
      restaurants: new Map(),
    };
    log.info("Initialized in-memory dev store (survives HMR)");
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

export async function getProjects(): Promise<Project[]> {
  if (hasSupabase()) {
    const { supabase } = await import("./supabase");
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      log.error("Failed to fetch projects from Supabase", {}, error);
      throw error;
    }
    return data ?? [];
  }
  const store = getDevStore();
  log.debug("Returning projects from dev store", { count: store.projects.size });
  return Array.from(store.projects.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
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
    vercel_project_id: data.vercel_project_id ?? null,
    vercel_deployment_url: data.vercel_deployment_url ?? null,
    deployment_status: "not_deployed",
    recipes_published: 0,
    keywords_remaining: 0,
    keywords_failed: 0,
    last_generation_at: null,
    next_scheduled_at: null,
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
  return getDevStore().projects.delete(id);
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
  return getDevStore().recipes.delete(recipeId);
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
  return getDevStore().restaurants.delete(id);
}
