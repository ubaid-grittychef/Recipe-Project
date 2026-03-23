import type { Metadata } from "next";
import Link from "next/link";
import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getMealTypes, getRecipesByMealType } from "@/lib/taxonomies";
import { ChefHat } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Meal Types | ${siteConfig.name}`,
  description: `Browse recipes by meal type on ${siteConfig.name}. Breakfast, lunch, dinner, desserts, snacks, and more.`,
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: `${siteConfig.url}/meals` },
};

export default async function MealsPage() {
  const recipes = await getAllRecipes();
  const mealTypes = getMealTypes(recipes);

  const mealsWithCounts = mealTypes.map((meal) => ({
    ...meal,
    count: getRecipesByMealType(recipes, meal.name).length,
  }));

  return (
    <div className="bg-[#fffdf7] dark:bg-slate-950">

      {/* Page header */}
      <div className="border-b-2 border-slate-900 dark:border-slate-700 bg-[#fffdf7] dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-900 dark:bg-slate-700" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Explore</span>
            <div className="h-px flex-1 bg-slate-900 dark:bg-slate-700" />
          </div>
          <div className="text-center">
            <h1
              className="text-4xl font-black text-slate-900 dark:text-slate-100 sm:text-6xl"
              style={{ fontFamily: "var(--font-heading), 'Georgia', serif", letterSpacing: "-0.03em" }}
            >
              Meal Types
            </h1>
            <p className="mt-4 text-sm text-slate-500">
              {mealsWithCounts.length > 0
                ? `${mealsWithCounts.length} meal ${mealsWithCounts.length === 1 ? "type" : "types"} to explore`
                : "Meal types will appear as recipes are published"}
            </p>
          </div>
        </div>
      </div>

      {/* Meals grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {mealsWithCounts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {mealsWithCounts.map((meal) => (
              <Link
                key={meal.slug}
                href={`/meal/${meal.slug}`}
                className="group flex flex-col items-center rounded-xl border border-[#ede8e0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl text-center"
              >
                <span className="text-4xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                  {meal.emoji}
                </span>
                <h2
                  className="mt-3 text-[14px] font-bold leading-snug text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors"
                  style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                >
                  {meal.name}
                </h2>
                <span className="mt-2 rounded-full bg-orange-50 dark:bg-orange-950/30 px-2.5 py-0.5 text-[11px] font-semibold text-orange-600">
                  {meal.count} {meal.count === 1 ? "recipe" : "recipes"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-28 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#d4cfc7]">
              <ChefHat className="h-9 w-9 text-[#c9bfb0]" />
            </div>
            <h2
              className="text-2xl font-black text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              No meal types yet
            </h2>
            <p className="mt-2 text-slate-500 text-sm">Meal types appear here as recipes are published.</p>
            <Link href="/" className="mt-6 inline-block text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors">
              &larr; Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
