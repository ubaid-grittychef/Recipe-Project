import { getAllRecipes, getCategories, getRestaurantNames } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import RecipeCard from "@/components/RecipeCard";
import Link from "next/link";
import { ArrowRight, ChefHat, Utensils, BookOpen } from "lucide-react";
import HeroSearch from "@/components/HeroSearch";
import RecentlyViewed from "@/components/RecentlyViewed";
import { getCategoryEmoji, getCategoryGradient } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: siteConfig.tagline ? `${siteConfig.name} | ${siteConfig.tagline}` : siteConfig.name },
  alternates: { canonical: siteConfig.url },
  openGraph: {
    url: siteConfig.url,
    ...(siteConfig.ogImage && {
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
    }),
  },
};

export default async function HomePage() {
  let recipes: Awaited<ReturnType<typeof getAllRecipes>> = [];
  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let restaurants: Awaited<ReturnType<typeof getRestaurantNames>> = [];

  try {
    [recipes, categories, restaurants] = await Promise.all([
      getAllRecipes(),
      getCategories(),
      getRestaurantNames(),
    ]);
  } catch {
    // Supabase unavailable — fall through with empty arrays to show "coming soon" state
  }

  const featured = recipes.slice(0, 3);
  const latest = recipes.slice(3, 15);

  return (
    <div className="bg-warm-cream">

      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section className="border-b-2 border-slate-900 dark:border-slate-700 bg-warm-cream">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16 sm:px-6">

          {/* Masthead rule */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px flex-1 bg-slate-900 dark:bg-slate-700" />
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.3em] text-slate-400">
              Restaurant Copycat Recipes
            </span>
            <div className="h-px flex-1 bg-slate-900 dark:bg-slate-700" />
          </div>

          {/* Site name */}
          <div className="text-center">
            <h1
              className="text-5xl font-black text-slate-900 dark:text-slate-100 sm:text-7xl xl:text-8xl"
              style={{ fontFamily: "var(--font-heading), 'Georgia', serif", letterSpacing: "-0.04em", lineHeight: 1 }}
            >
              {siteConfig.name}
            </h1>

            {siteConfig.tagline && (
              <div className="mt-5 flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-orange-400" />
                <p className="text-sm italic text-slate-500 dark:text-slate-400 font-medium">{siteConfig.tagline}</p>
                <div className="h-px w-12 bg-orange-400" />
              </div>
            )}
          </div>

          {/* Search */}
          <div className="mt-10 max-w-xl mx-auto">
            <HeroSearch />
          </div>

          {/* Stats */}
          {recipes.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
              <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <BookOpen className="h-4 w-4 text-orange-400" />
                <strong className="text-slate-900 dark:text-slate-100 font-bold">{recipes.length}</strong> recipes
              </span>
              {categories.length > 0 && (
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Utensils className="h-4 w-4 text-orange-400" />
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{categories.length}</strong> categories
                </span>
              )}
              {restaurants.length > 0 && (
                <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <ChefHat className="h-4 w-4 text-orange-400" />
                  <strong className="text-slate-900 dark:text-slate-100 font-bold">{restaurants.length}</strong> restaurants
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── Recently Viewed ────────────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <RecentlyViewed />
      </div>

      {/* ─── Featured Recipes ──────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <SectionHeader eyebrow="Editor's Picks" title="Featured Recipes" href="/recipes" linkLabel="View all" />
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      )}

      {/* ─── Browse by Category ────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="border-y border-warm-border bg-white dark:bg-slate-900 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeader eyebrow="Explore" title="Browse by Category" href="/categories" linkLabel="All categories" />
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {categories.slice(0, 12).map((cat) => {
                const gradient = getCategoryGradient(cat.name);
                const emoji = getCategoryEmoji(cat.name);
                return (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="group relative overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                    <div className="relative flex flex-col items-center px-3 py-6 text-center">
                      <span className="text-4xl transition-transform duration-300 group-hover:scale-110 drop-shadow">{emoji}</span>
                      <p
                        className="mt-2.5 text-sm font-bold text-white drop-shadow-sm leading-tight"
                        style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                      >
                        {cat.name}
                      </p>
                      <span className="mt-1 rounded-full bg-black/20 px-2 py-0.5 text-[0.625rem] font-semibold text-white/90">
                        {cat.count}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Browse by Restaurant ──────────────────────────────────── */}
      {restaurants.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <SectionHeader eyebrow="Restaurants" title="Browse by Restaurant" />
          <div className="mt-6 flex flex-wrap gap-2">
            {restaurants.map((r) => (
              <Link
                key={r.slug}
                href={`/category/${r.slug}`}
                className="group flex items-center gap-2 rounded-full border border-warm-border bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all duration-200 hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 hover:text-orange-700"
              >
                <Utensils className="h-3.5 w-3.5 text-slate-300 group-hover:text-orange-400 transition-colors" />
                {r.name}
                <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-xs text-slate-500 dark:text-slate-400 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 group-hover:text-orange-600 transition-colors">
                  {r.count}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─── Latest Recipes ────────────────────────────────────────── */}
      {latest.length > 0 && (
        <section className="border-t border-warm-border bg-warm-sand py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeader eyebrow="Fresh" title="Latest Recipes" href="/recipes" linkLabel="View all" />
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latest.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── All recipes when there are only a few ─────────────────── */}
      {recipes.length > 0 && featured.length === recipes.length && (
        <section className="border-t border-warm-border bg-warm-sand py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeader eyebrow="All" title="Our Recipes" href="/recipes" linkLabel="View all" />
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Empty state ───────────────────────────────────────────── */}
      {recipes.length === 0 && (
        <section className="mx-auto max-w-2xl px-4 py-28 text-center sm:px-6">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-warm-border-dark">
            <ChefHat className="h-9 w-9 text-warm-muted" />
          </div>
          <h2
            className="text-3xl font-black text-slate-900 dark:text-slate-100"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            Recipes are on the way
          </h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400 leading-relaxed">
            We&apos;re building our collection of restaurant-quality copycat recipes.<br />
            Check back soon or follow us for updates.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/about"
              className="rounded-full border border-warm-border bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:border-slate-300 hover:shadow"
            >
              Learn more
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Shared section header ── */
function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.25em] text-orange-500">{eyebrow}</p>
        <h2
          className="mt-1 text-2xl font-black text-slate-900 dark:text-slate-100 sm:text-3xl"
          style={{ fontFamily: "var(--font-heading), 'Georgia', serif", letterSpacing: "-0.02em" }}
        >
          {title}
        </h2>
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="flex items-center gap-1.5 text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}
