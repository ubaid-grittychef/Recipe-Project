import { getAllRecipes, getCategories, getRestaurantNames } from "@/lib/data";
import RecipeBrowser from "./RecipeBrowser";
import { siteConfig } from "@/lib/config";

export const revalidate = 3600;

export const metadata = {
  title: "All Recipes | Browse & Filter",
  description: "Browse our complete collection of recipes. Filter by category, restaurant, or difficulty.",
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema).replace(/<\//g, "<\\/") }} />
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">All Recipes</h1>
        <p className="mt-2 text-slate-400">
          {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} — search, filter, and explore.
        </p>
      </div>

      <RecipeBrowser recipes={recipes} categories={categories} restaurants={restaurants} />
    </div>
    </>
  );
}
