import type { MetadataRoute } from "next";
import { getRecipeSlugsWithDates, getCategories, getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { COLLECTIONS } from "@/lib/collections";
import { getCuisines, getMealTypes } from "@/lib/taxonomies";

// Revalidate every hour so the sitemap reflects newly published recipes promptly
export const revalidate = 300;

/**
 * Google requires a maximum of 50,000 URLs per sitemap file.
 * This limit ensures we never exceed it. If the site grows beyond it,
 * implement a sitemap index (sitemap/[page]/route.ts) to serve chunks.
 */
const SITEMAP_MAX_URLS = 49_900;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url.replace(/\/$/, "");

  const [recipes, categories, allRecipes] = await Promise.all([
    getRecipeSlugsWithDates(),
    getCategories(),
    getAllRecipes(),
  ]);

  const cuisines = getCuisines(allRecipes);
  const mealTypes = getMealTypes(allRecipes);

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/recipes`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cuisines`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/meals`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const collectionPages: MetadataRoute.Sitemap = COLLECTIONS.map((c) => ({
    url: `${baseUrl}/collections/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const cuisinePages: MetadataRoute.Sitemap = cuisines.map((c) => ({
    url: `${baseUrl}/cuisine/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const mealPages: MetadataRoute.Sitemap = mealTypes.map((m) => ({
    url: `${baseUrl}/meal/${m.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Cap recipe pages to stay within the Google 50k sitemap URL limit
  const usedSlots = staticPages.length + categoryPages.length + collectionPages.length + cuisinePages.length + mealPages.length;
  const recipeSlice = recipes.slice(0, Math.max(0, SITEMAP_MAX_URLS - usedSlots));

  const recipePages: MetadataRoute.Sitemap = recipeSlice.map((r) => ({
    url: `${baseUrl}/recipe/${r.slug}`,
    lastModified: r.published_at ? new Date(r.published_at) : new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...collectionPages, ...cuisinePages, ...mealPages, ...recipePages];
}
