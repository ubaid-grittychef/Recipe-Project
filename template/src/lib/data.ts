import { getSupabase } from "./supabase";
import { Recipe } from "./types";
import { slugifyCategory } from "./utils";

function isConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function getAllRecipes(): Promise<Recipe[]> {
  if (!isConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("recipes")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  if (!isConfigured()) return null;
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
  if (!isConfigured()) return [];
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
  if (!isConfigured()) return [];
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
  if (!isConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("recipes")
    .select("category, restaurant_name")
    .eq("status", "published");

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    // Prefer the AI-assigned category field; fall back to restaurant_name for legacy recipes
    const name = (row.category as string | null) || (row.restaurant_name as string | null);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      slug: slugifyCategory(name),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getRestaurantNames(): Promise<
  { name: string; slug: string; count: number }[]
> {
  if (!isConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("recipes")
    .select("restaurant_name")
    .eq("status", "published")
    .not("restaurant_name", "is", null);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const name = row.restaurant_name as string;
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({
      name,
      slug: slugifyCategory(name),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export async function getRelatedRecipes(
  currentSlug: string,
  restaurant: string | null,
  category: string | null = null,
  limit = 4
): Promise<Recipe[]> {
  if (!isConfigured()) return [];
  const supabase = getSupabase();

  const base = supabase
    .from("recipes")
    .select("*")
    .eq("status", "published")
    .neq("slug", currentSlug)
    .limit(limit)
    .order("published_at", { ascending: false });

  // 1. Try restaurant match first
  if (restaurant) {
    const { data, error } = await base.eq("restaurant_name", restaurant);
    if (error) throw error;
    if (data && data.length > 0) return data;
  }

  // 2. Try category match
  if (category) {
    const { data, error } = await base.eq("category", category);
    if (error) throw error;
    if (data && data.length > 0) return data;
  }

  // 3. Fall back to latest recipes
  const { data, error } = await base;
  if (error) throw error;
  return data ?? [];
}

export async function getRecipeSlugs(): Promise<string[]> {
  if (!isConfigured()) return [];
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
  if (!isConfigured()) return [];
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
