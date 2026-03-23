"use client";

export interface RecentRecipe {
  slug: string;
  title: string;
  image_url: string | null;
  category: string | null;
  total_time: string | null;
  rating: number | null;
}

const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 10;

export function getRecentlyViewed(): RecentRecipe[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

export function addRecentlyViewed(recipe: RecentRecipe): void {
  if (typeof window === "undefined") return;
  try {
    const current = getRecentlyViewed().filter(r => r.slug !== recipe.slug);
    current.unshift(recipe);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, MAX_ITEMS)));
  } catch {}
}
