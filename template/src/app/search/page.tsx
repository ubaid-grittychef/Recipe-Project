import { getAllRecipes } from "@/lib/data";
import RecipeCard from "@/components/RecipeCard";
import Link from "next/link";
import { ArrowLeft, Search, ChefHat } from "lucide-react";
import type { Metadata } from "next";
import SearchInput from "./SearchInput";
import { siteConfig } from "@/lib/config";

export const revalidate = 300;

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const title = query ? `Search results for "${query}" | ${siteConfig.name}` : `Search Recipes | ${siteConfig.name}`;
  const description = query ? `Browse recipes matching "${query}".` : "Search through our full recipe collection.";
  return {
    title,
    description,
    metadataBase: new URL(siteConfig.url),
    robots: { index: false, follow: true },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `${siteConfig.url}/search` },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const allRecipes = await getAllRecipes();

  const results = query
    ? allRecipes.filter((r) => {
        const haystack = [
          r.title,
          r.description,
          r.keyword,
          r.category ?? "",
          r.restaurant_name ?? "",
          ...(r.focus_keywords ?? []),
        ]
          .join(" ")
          .toLowerCase();
        return query
          .toLowerCase()
          .split(/\s+/)
          .every((word) => haystack.includes(word));
      })
    : allRecipes;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      {/* Back link */}
      <Link
        href="/recipes"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse all recipes
      </Link>

      {/* Search bar */}
      <div className="mb-8 flex items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {query ? (
              <>
                Results for{" "}
                <span className="text-primary-600">&ldquo;{query}&rdquo;</span>
              </>
            ) : (
              "Search Recipes"
            )}
          </h1>
          {query && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {results.length} recipe{results.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>
      </div>

      {/* Live search input */}
      <SearchInput initialQuery={query} />

      {/* Results grid */}
      <div className="mt-8">
        {results.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : query ? (
          <div className="py-20 text-center">
            <Search className="mx-auto h-14 w-14 text-slate-200 dark:text-slate-700" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              No results for &ldquo;{query}&rdquo;
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Try a different term or{" "}
              <Link href="/recipes" className="text-primary-600 hover:underline">
                browse all recipes
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="py-20 text-center">
            <ChefHat className="mx-auto h-14 w-14 text-slate-200 dark:text-slate-700" />
            <p className="mt-4 text-slate-500">
              Start typing to search through {allRecipes.length} recipes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
