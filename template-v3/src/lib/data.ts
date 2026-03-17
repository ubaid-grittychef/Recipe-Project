import { getSupabase } from "./supabase";
import { Recipe } from "./types";
import { slugifyCategory } from "./utils";

// ── Data source detection ─────────────────────────────────────────────────────

function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Local preview mode: reads from the factory app running on localhost
const FACTORY_URL = process.env.FACTORY_API_URL; // e.g. http://localhost:3000
const FACTORY_PROJECT_ID = process.env.FACTORY_PROJECT_ID;
// FACTORY_SECRET = sha256(FACTORY_PASSWORD) — pre-computed so we avoid crypto here
const FACTORY_SECRET = process.env.FACTORY_SECRET;

function isFactoryMode(): boolean {
  return !isSupabaseConfigured() && !!FACTORY_URL && !!FACTORY_PROJECT_ID;
}

async function fetchAllFromFactory(): Promise<Recipe[]> {
  const url = `${FACTORY_URL}/api/projects/${FACTORY_PROJECT_ID}/recipes?status=published&limit=500`;
  // NOTE: x-factory-secret is sent for future server-side validation.
  // Currently the factory API does not validate this header — the per-site
  // Supabase credentials are the primary data isolation boundary.
  // To enforce: add header check in /api/projects/[id]/recipes GET route
  // against hashToken(FACTORY_PASSWORD) when no session cookie is present.
  const headers: Record<string, string> = { "x-factory-secret": FACTORY_SECRET ?? "" };
  try {
    const res = await fetch(url, { cache: "no-store", headers });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.recipes ?? []) as Recipe[];
  } catch {
    console.error("[FactoryMode] fetch failed:", url);
    return [];
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getAllRecipes(): Promise<Recipe[]> {
  if (isFactoryMode()) return fetchAllFromFactory();
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.find((r) => r.slug === slug) ?? null;
  }
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("recipes")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Data] getRecipeBySlug error:", error);
    return null;
  }
  return data;
}

export async function getRecipesByRestaurant(
  restaurant: string
): Promise<Recipe[]> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.filter((r) => r.restaurant_name === restaurant);
  }
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .eq("status", "published")
    .eq("restaurant_name", restaurant)
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecipesByCategory(category: string): Promise<Recipe[]> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.filter((r) => r.category === category);
  }
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .eq("status", "published")
    .eq("category", category)
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCategories(): Promise<
  { name: string; slug: string; count: number }[]
> {
  const rows = isFactoryMode()
    ? await fetchAllFromFactory()
    : await (async () => {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await getSupabase()
          .from("recipes")
          .select("category, restaurant_name")
          .eq("status", "published");
        if (error) throw error;
        return data ?? [];
      })();

  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = (row.category as string | null) || (row.restaurant_name as string | null);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, slug: slugifyCategory(name), count }))
    .sort((a, b) => b.count - a.count);
}

export async function getRestaurantNames(): Promise<
  { name: string; slug: string; count: number }[]
> {
  const rows = isFactoryMode()
    ? await fetchAllFromFactory()
    : await (async () => {
        if (!isSupabaseConfigured()) return [];
        const { data, error } = await getSupabase()
          .from("recipes")
          .select("restaurant_name")
          .eq("status", "published")
          .not("restaurant_name", "is", null);
        if (error) throw error;
        return data ?? [];
      })();

  const counts = new Map<string, number>();
  for (const row of rows) {
    const name = row.restaurant_name as string | null;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, slug: slugifyCategory(name), count }))
    .sort((a, b) => b.count - a.count);
}

export async function getRelatedRecipes(
  currentSlug: string,
  restaurant: string | null,
  category: string | null = null,
  limit = 4
): Promise<Recipe[]> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    const others = all.filter((r) => r.slug !== currentSlug);
    if (restaurant) {
      const match = others.filter((r) => r.restaurant_name === restaurant);
      if (match.length > 0) return match.slice(0, limit);
    }
    if (category) {
      const match = others.filter((r) => r.category === category);
      if (match.length > 0) return match.slice(0, limit);
    }
    return others.slice(0, limit);
  }
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabase();
  const base = supabase
    .from("recipes")
    .select("*")
    .eq("status", "published")
    .neq("slug", currentSlug)
    .limit(limit)
    .order("published_at", { ascending: false });

  if (restaurant) {
    const { data, error } = await base.eq("restaurant_name", restaurant);
    if (error) throw error;
    if (data && data.length > 0) return data;
  }
  if (category) {
    const { data, error } = await base.eq("category", category);
    if (error) throw error;
    if (data && data.length > 0) return data;
  }
  const { data, error } = await base;
  if (error) throw error;
  return data ?? [];
}

export async function getRecipeSlugs(): Promise<string[]> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.map((r) => r.slug);
  }
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabase()
    .from("recipes")
    .select("slug")
    .eq("status", "published");

  if (error) throw error;
  return (data ?? []).map((r) => r.slug);
}

export async function getRecipeSlugsWithDates(): Promise<
  { slug: string; published_at: string | null }[]
> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.map((r) => ({ slug: r.slug, published_at: r.published_at }));
  }
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getSupabase()
    .from("recipes")
    .select("slug, published_at")
    .eq("status", "published");

  if (error) throw error;
  return (data ?? []).map((r) => ({
    slug: r.slug,
    published_at: r.published_at,
  }));
}
