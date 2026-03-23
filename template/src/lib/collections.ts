import { Recipe } from "./types";

export interface Collection {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  filter: (recipes: Recipe[]) => Recipe[];
}

function parseMins(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const match = timeStr.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export const COLLECTIONS: Collection[] = [
  {
    slug: "quick-meals",
    name: "Quick Meals",
    description: "Delicious recipes ready in 30 minutes or less",
    emoji: "\u26A1",
    filter: (recipes) => recipes.filter(r => {
      const mins = parseMins(r.total_time);
      return mins !== null && mins <= 30;
    }),
  },
  {
    slug: "easy-recipes",
    name: "Easy Recipes",
    description: "Simple recipes anyone can make",
    emoji: "\uD83D\uDC4C",
    filter: (recipes) => recipes.filter(r => r.difficulty === "Easy"),
  },
  {
    slug: "most-popular",
    name: "Most Popular",
    description: "Our highest-rated recipes loved by home cooks",
    emoji: "\u2B50",
    filter: (recipes) => [...recipes].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 20),
  },
  {
    slug: "recently-added",
    name: "Recently Added",
    description: "Fresh recipes just added to our collection",
    emoji: "\uD83C\uDD95",
    filter: (recipes) => [...recipes].sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()).slice(0, 20),
  },
  {
    slug: "healthy-eating",
    name: "Healthy Eating",
    description: "Nutritious recipes under 400 calories",
    emoji: "\uD83E\uDD57",
    filter: (recipes) => recipes.filter(r => {
      const nutrition = r.nutrition as any;
      if (!nutrition?.calories) return false;
      const cal = parseInt(String(nutrition.calories));
      return !isNaN(cal) && cal < 400;
    }),
  },
  {
    slug: "weekend-cooking",
    name: "Weekend Cooking",
    description: "Recipes worth taking your time with",
    emoji: "\uD83C\uDF73",
    filter: (recipes) => recipes.filter(r => {
      const mins = parseMins(r.total_time);
      return mins !== null && mins > 60;
    }),
  },
];

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS.find(c => c.slug === slug);
}
