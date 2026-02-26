import { getAllRecipes, getCategories, getRestaurantNames } from "@/lib/data";
import RecipeBrowser from "./RecipeBrowser";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900">All Recipes</h1>
        <p className="mt-2 text-slate-500">
          {recipes.length} recipe{recipes.length !== 1 ? "s" : ""} — search, filter, and explore.
        </p>
      </div>

      <RecipeBrowser
        recipes={recipes}
        categories={categories}
        restaurants={restaurants}
      />
    </div>
  );
}
