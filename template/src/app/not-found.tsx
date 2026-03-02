import Link from "next/link";
import { ChefHat, Search, Home, BookOpen } from "lucide-react";
import { siteConfig } from "@/lib/config";
import { getAllRecipes } from "@/lib/data";

export default async function NotFound() {
  // Show a few recent recipes to guide the user somewhere useful
  let recentRecipes: { slug: string; title: string; category: string | null }[] = [];
  try {
    const all = await getAllRecipes();
    recentRecipes = all.slice(0, 3).map((r) => ({
      slug: r.slug,
      title: r.title,
      category: r.category,
    }));
  } catch {
    // Silently ignore — Supabase might not be configured in preview builds
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div
        className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl text-white"
        style={{ backgroundColor: siteConfig.primaryColor }}
      >
        <ChefHat className="h-10 w-10" />
      </div>

      <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
        Recipe not found
      </h1>
      <p className="mt-3 text-base text-slate-600">
        This recipe seems to have wandered off the menu. It may have been
        moved, renamed, or removed.
      </p>

      {/* Quick navigation links */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: siteConfig.primaryColor }}
        >
          <Home className="h-4 w-4" />
          Home
        </Link>
        <Link
          href="/recipes"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <BookOpen className="h-4 w-4" />
          All Recipes
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
        >
          <Search className="h-4 w-4" />
          Search
        </Link>
      </div>

      {/* Recent recipes to keep the user engaged */}
      {recentRecipes.length > 0 && (
        <div className="mt-12">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
            You might like
          </h2>
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white text-left">
            {recentRecipes.map((r) => (
              <Link
                key={r.slug}
                href={`/recipe/${r.slug}`}
                className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.title}</p>
                  {r.category && (
                    <p className="mt-0.5 text-xs text-slate-400">{r.category}</p>
                  )}
                </div>
                <span className="text-xs text-slate-300">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
