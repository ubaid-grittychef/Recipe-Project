import { getAllRecipes, getCategories, getRestaurantNames } from "@/lib/data";
import RecipeBrowser from "./RecipeBrowser";
import type { Metadata } from "next";
import { siteConfig } from "@/lib/config";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `All Recipes | ${siteConfig.name}`,
  description: "Browse our complete collection of restaurant copycat recipes. Filter by category, restaurant, or difficulty.",
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: `${siteConfig.url}/recipes` },
};

export default async function RecipesPage() {
  const [recipes, categories, restaurants] = await Promise.all([
    getAllRecipes(),
    getCategories(),
    getRestaurantNames(),
  ]);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `All Recipes | ${siteConfig.name}`,
    url: `${siteConfig.url}/recipes`,
    numberOfItems: recipes.length,
    itemListElement: recipes.slice(0, 20).map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteConfig.url}/recipe/${r.slug}`,
      name: r.title,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/<\//g, "<\\/") }}
      />

      <div className="bg-[#fffdf7]">
        {/* ── Page header ────────────────────────────────── */}
        <div className="border-b-2 border-slate-900 bg-[#fffdf7]">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-slate-900" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Collection</span>
              <div className="h-px flex-1 bg-slate-900" />
            </div>
            <div className="text-center">
              <h1
                className="text-4xl font-black text-slate-900 sm:text-6xl"
                style={{ fontFamily: "var(--font-heading), 'Georgia', serif", letterSpacing: "-0.03em" }}
              >
                All Recipes
              </h1>
              <p className="mt-4 text-sm text-slate-500">
                {recipes.length > 0
                  ? `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} — search, filter, and explore`
                  : "Our collection is growing — check back soon"}
              </p>
            </div>
          </div>
        </div>

        {/* ── Browser ─────────────────────────────────────── */}
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <RecipeBrowser
            recipes={recipes}
            categories={categories}
            restaurants={restaurants}
          />
        </div>
      </div>
    </>
  );
}
