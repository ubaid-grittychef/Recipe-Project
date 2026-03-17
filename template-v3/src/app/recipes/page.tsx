import type { Metadata } from "next";
import { getAllRecipes, getCategories } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import RecipeBrowser from "./RecipeBrowser";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `All Recipes`,
  description: `Browse all ${siteConfig.name} copycat recipes. Filter by category, difficulty, and sort by newest or top rated.`,
  alternates: { canonical: `${siteConfig.url}/recipes` },
};

export default async function RecipesPage() {
  const [recipes, categories] = await Promise.all([getAllRecipes(), getCategories()]);

  return (
    <div className="bg-bg min-h-screen">
      {/* Header */}
      <div className="border-b-[3px] border-ink bg-white py-12">
        <div className="max-w-site mx-auto px-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="h-px flex-1 bg-ink" />
            <span className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-ink-3">All Recipes</span>
            <div className="h-px flex-1 bg-ink" />
          </div>
          <h1 className="font-serif text-[40px] font-black text-ink tracking-[-1px] text-center">
            {recipes.length} {siteConfig.name} Recipes
          </h1>
          <p className="text-center text-[15px] text-ink-3 mt-3">
            Every copycat recipe we've made. Filter by category or difficulty.
          </p>
        </div>
      </div>

      <RecipeBrowser recipes={recipes} categories={categories.map((c) => c.name)} />
    </div>
  );
}
