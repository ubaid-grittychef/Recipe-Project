import type { Metadata } from "next";
import Link from "next/link";
import { getAllRecipes, getCategories } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import RecipeCard from "@/components/RecipeCard";
import SearchInput from "./SearchInput";

export const revalidate = 300;

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  return {
    title: query ? `"${query}" — Search Results` : "Search Recipes",
    description: query
      ? `Browse recipes matching "${query}" on ${siteConfig.name}.`
      : `Search through the full ${siteConfig.name} recipe collection.`,
    robots: { index: false, follow: true },
    alternates: { canonical: `${siteConfig.url}/search` },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [allRecipes, categories] = await Promise.all([getAllRecipes(), getCategories()]);

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
    <div className="bg-bg min-h-screen">

      {/* ── Search hero ──────────────────────────────── */}
      <div className="border-b-[3px] border-ink bg-white py-14">
        <div className="max-w-site mx-auto px-6">
          <div className="flex items-center gap-5 mb-8">
            <div className="h-px flex-1 bg-ink" />
            <span className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-ink-3">Search</span>
            <div className="h-px flex-1 bg-ink" />
          </div>

          <h1 className="font-serif text-[40px] font-black text-ink tracking-[-1px] text-center mb-8">
            {query ? (
              <>Results for <em className="text-red not-italic">&ldquo;{query}&rdquo;</em></>
            ) : (
              "Search Recipes"
            )}
          </h1>

          <div className="max-w-2xl mx-auto">
            <SearchInput initialQuery={query} />
          </div>

          {/* Popular categories */}
          {!query && categories.length > 0 && (
            <div className="mt-8 max-w-2xl mx-auto">
              <p className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 mb-3">Popular Categories</p>
              <div className="flex flex-wrap gap-2">
                {categories.slice(0, 10).map((cat) => (
                  <Link
                    key={cat.slug}
                    href={`/category/${cat.slug}`}
                    className="border border-rule px-3 py-1.5 text-[12px] font-bold text-ink-2 hover:border-red hover:text-red hover:bg-red-bg transition-all"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────── */}
      <div className="max-w-site mx-auto px-6 py-10">
        {results.length > 0 ? (
          <>
            {query && (
              <p className="text-[12px] font-bold text-ink-4 uppercase tracking-[1px] mb-6">
                {results.length} {results.length === 1 ? "recipe" : "recipes"} found
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-rule">
              {results.map((recipe, i) => {
                const col = i % 3;
                const isLastCol = col === 2;
                return (
                  <div key={recipe.id} className={`${!isLastCol ? "border-r border-rule" : ""} ${i >= 3 ? "border-t border-rule" : ""}`}>
                    <RecipeCard recipe={recipe} rank={i + 1} />
                  </div>
                );
              })}
            </div>
          </>
        ) : query ? (
          <div className="border border-rule py-20 text-center">
            <p className="font-serif text-[28px] font-black text-ink-4 mb-2">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-[14px] text-ink-4 mb-6">Try a different term or browse all recipes.</p>
            <Link href="/recipes" className="btn-outline">Browse All Recipes</Link>
          </div>
        ) : (
          <div className="border border-rule py-20 text-center">
            <p className="text-[14px] text-ink-4">
              Start typing to search through {allRecipes.length} recipes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
