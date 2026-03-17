import { getSupabase } from "./supabase";
import { Recipe } from "./types";
import { slugifyCategory } from "./utils";

function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

const FACTORY_URL = process.env.FACTORY_API_URL;
const FACTORY_PROJECT_ID = process.env.FACTORY_PROJECT_ID;
const FACTORY_SECRET = process.env.FACTORY_SECRET;

function isFactoryMode(): boolean {
  return !isSupabaseConfigured() && !!FACTORY_URL && !!FACTORY_PROJECT_ID;
}

async function fetchAllFromFactory(): Promise<Recipe[]> {
  const url = `${FACTORY_URL}/api/projects/${FACTORY_PROJECT_ID}/recipes?status=published&limit=500`;
  const headers: Record<string, string> = { "x-factory-secret": FACTORY_SECRET ?? "" };
  try {
    const res = await fetch(url, { cache: "no-store", headers });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.recipes ?? []) as Recipe[];
  } catch {
    return [];
  }
}

export async function getAllRecipes(): Promise<Recipe[]> {
  if (isFactoryMode()) return fetchAllFromFactory();
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await getSupabase()
    .from("recipes").select("*").eq("status", "published").order("published_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.find((r) => r.slug === slug) ?? null;
  }
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await getSupabase()
    .from("recipes").select("*").eq("slug", slug).eq("status", "published").single();
  if (error) return null;
  return data;
}

export async function getRelatedRecipes(slug: string, category: string | null, limit = 4): Promise<Recipe[]> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.filter((r) => r.slug !== slug && r.category === category).slice(0, limit);
  }
  if (!isSupabaseConfigured()) return [];
  let q = getSupabase().from("recipes").select("*").eq("status", "published").neq("slug", slug).limit(limit);
  if (category) q = q.eq("category", category);
  const { data } = await q;
  return data ?? [];
}

export async function getRecipeSlugs(): Promise<string[]> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.map((r) => r.slug);
  }
  if (!isSupabaseConfigured()) return [];
  const { data } = await getSupabase().from("recipes").select("slug").eq("status", "published");
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

export async function getRecipeSlugsWithDates(): Promise<{ slug: string; published_at: string | null }[]> {
  if (isFactoryMode()) {
    const all = await fetchAllFromFactory();
    return all.map((r) => ({ slug: r.slug, published_at: r.published_at }));
  }
  if (!isSupabaseConfigured()) return [];
  const { data } = await getSupabase().from("recipes").select("slug, published_at").eq("status", "published");
  return data ?? [];
}

export async function getCategories(): Promise<{ name: string; slug: string; count: number }[]> {
  const all = await getAllRecipes();
  const counts: Record<string, number> = {};
  for (const r of all) {
    if (r.category) counts[r.category] = (counts[r.category] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, slug: slugifyCategory(name), count }))
    .sort((a, b) => b.count - a.count);
}

export async function getRecipesByCategory(category: string): Promise<Recipe[]> {
  const all = await getAllRecipes();
  return all.filter((r) => r.category?.toLowerCase() === category.toLowerCase());
}

export async function getRecipesByRestaurant(restaurantName: string): Promise<Recipe[]> {
  const all = await getAllRecipes();
  return all.filter((r) => r.restaurant_name?.toLowerCase() === restaurantName.toLowerCase());
}

export async function getRestaurantNames(): Promise<{ name: string; slug: string; count: number }[]> {
  const all = await getAllRecipes();
  const counts: Record<string, number> = {};
  for (const r of all) {
    if (r.restaurant_name) counts[r.restaurant_name] = (counts[r.restaurant_name] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), count }))
    .sort((a, b) => b.count - a.count);
}

export async function searchRecipes(query: string): Promise<Recipe[]> {
  const all = await getAllRecipes();
  const q = query.toLowerCase();
  return all.filter(
    (r) => r.title.toLowerCase().includes(q) || r.keyword.toLowerCase().includes(q) || (r.category ?? "").toLowerCase().includes(q)
  );
}
