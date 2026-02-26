import { getAllRecipes, getCategories, getRestaurantNames } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import RecipeCard from "@/components/RecipeCard";
import Link from "next/link";
import { ArrowRight, ChefHat, Utensils } from "lucide-react";
import HeroSearch from "@/components/HeroSearch";
import { getCategoryEmoji } from "@/lib/utils";

export const revalidate = 3600;

export default async function HomePage() {
  const [recipes, categories, restaurants] = await Promise.all([
    getAllRecipes(),
    getCategories(),
    getRestaurantNames(),
  ]);

  const featured = recipes.slice(0, 3);
  const latest = recipes.slice(0, 12);

  return (
    <>
      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: siteConfig.primaryColor }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full opacity-10 blur-3xl"
          style={{ backgroundColor: siteConfig.primaryColor }}
        />

        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ backgroundColor: siteConfig.primaryColor }}
          >
            <ChefHat className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            {siteConfig.name}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            {siteConfig.tagline}
          </p>

          {/* Search bar */}
          <HeroSearch />

          {/* Quick stat */}
          {recipes.length > 0 && (
            <p className="mt-6 text-sm text-slate-400">
              Discover{" "}
              <span className="font-semibold text-white">{recipes.length}+</span>{" "}
              recipes
              {categories.length > 0 && (
                <>
                  {" "}across{" "}
                  <span className="font-semibold text-white">
                    {categories.length}
                  </span>{" "}
                  categories
                </>
              )}
            </p>
          )}
        </div>
      </section>

      {/* ─── Featured Recipes ─────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                Editor&apos;s Picks
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Featured Recipes
              </h2>
            </div>
            <Link
              href="/recipes"
              className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {featured.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Browse by Category ───────────────────────────────── */}
      {categories.length > 0 && (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                  Explore
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Browse by Category
                </h2>
              </div>
              <Link
                href="/categories"
                className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                All categories
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {categories.slice(0, 10).map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                >
                  <span className="mb-2 text-3xl">
                    {getCategoryEmoji(cat.name)}
                  </span>
                  <p className="font-semibold text-slate-900 group-hover:text-primary-700">
                    {cat.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {cat.count} {cat.count === 1 ? "recipe" : "recipes"}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Browse by Restaurant ─────────────────────────────── */}
      {restaurants.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                Restaurants
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                Browse by Restaurant
              </h2>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {restaurants.map((r) => (
              <Link
                key={r.slug}
                href={`/category/${r.slug}`}
                className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 hover:shadow"
              >
                <Utensils className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary-500" />
                {r.name}
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 group-hover:bg-primary-100 group-hover:text-primary-600">
                  {r.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Latest Recipes ───────────────────────────────────── */}
      {latest.length > 0 && (
        <section className={`${restaurants.length === 0 ? "" : "bg-slate-50"}`}>
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                  Fresh
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Latest Recipes
                </h2>
              </div>
              <Link
                href="/recipes"
                className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latest.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Empty state ──────────────────────────────────────── */}
      {recipes.length === 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <ChefHat className="mx-auto h-16 w-16 text-slate-200" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            Recipes coming soon
          </h2>
          <p className="mt-2 text-slate-500">
            We&apos;re cooking up amazing recipes. Check back soon!
          </p>
        </section>
      )}
    </>
  );
}
