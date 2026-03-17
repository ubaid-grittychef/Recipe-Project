"use client";

import { useState, useMemo } from "react";
import RecipeCard from "@/components/RecipeCard";
import { Recipe } from "@/lib/types";
import { Search, X, SlidersHorizontal, ChefHat } from "lucide-react";

interface Props {
  recipes: Recipe[];
  categories: { name: string; slug: string; count: number }[];
  restaurants: { name: string; slug: string; count: number }[];
}

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

type SortOption = "newest" | "rating" | "cook_time" | "word_count";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Top Rated" },
  { value: "cook_time", label: "Quickest" },
  { value: "word_count", label: "Most Detailed" },
];

function parseMins(str?: string | null): number {
  if (!str) return 999;
  const m = str.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

export default function RecipeBrowser({ recipes, categories, restaurants }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");

  const filtered = useMemo(() => {
    let result = recipes;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.keyword.toLowerCase().includes(q) ||
          (r.category?.toLowerCase().includes(q) ?? false) ||
          (r.restaurant_name?.toLowerCase().includes(q) ?? false)
      );
    }
    if (selectedCategory) result = result.filter((r) => r.category?.toLowerCase() === selectedCategory.toLowerCase());
    if (selectedRestaurant) result = result.filter((r) => r.restaurant_name?.toLowerCase() === selectedRestaurant.toLowerCase());
    if (selectedDifficulty) result = result.filter((r) => r.difficulty === selectedDifficulty);

    result = [...result].sort((a, b) => {
      switch (sort) {
        case "rating": return (b.rating ?? 0) - (a.rating ?? 0);
        case "cook_time": return parseMins(a.total_time || a.cook_time) - parseMins(b.total_time || b.cook_time);
        case "word_count": return (b.word_count ?? 0) - (a.word_count ?? 0);
        default: return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
    });

    return result;
  }, [recipes, query, selectedCategory, selectedRestaurant, selectedDifficulty, sort]);

  const activeFilters = [selectedCategory, selectedRestaurant, selectedDifficulty].filter(Boolean).length;

  function clearAll() {
    setQuery("");
    setSelectedCategory(null);
    setSelectedRestaurant(null);
    setSelectedDifficulty(null);
  }

  const chipBase = "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  const chipActive = "border-slate-500 bg-slate-700 text-slate-100";
  const chipInactive = "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200";

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes by title, ingredient, keyword…"
          className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-11 pr-4 text-sm text-slate-100 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 placeholder:text-slate-500"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors sm:hidden ${
            activeFilters > 0 ? "border-slate-500 bg-slate-700 text-slate-100" : "border-slate-700 bg-slate-800 text-slate-400"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilters > 0 && (
            <span className="rounded-full bg-slate-500 px-1.5 py-0.5 text-xs text-white">{activeFilters}</span>
          )}
        </button>

        <div className={`flex flex-wrap gap-2 ${filtersOpen ? "flex" : "hidden sm:flex"}`}>
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-600">Category:</span>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                  className={`${chipBase} ${selectedCategory === cat.name ? chipActive : chipInactive}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {restaurants.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-600">Restaurant:</span>
              {restaurants.slice(0, 8).map((r) => (
                <button
                  key={r.slug}
                  onClick={() => setSelectedRestaurant(selectedRestaurant === r.name ? null : r.name)}
                  className={`${chipBase} ${selectedRestaurant === r.name ? chipActive : chipInactive}`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-600">Difficulty:</span>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDifficulty(selectedDifficulty === d ? null : d)}
                className={`${chipBase} ${selectedDifficulty === d ? chipActive : chipInactive}`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-500">
            <span className="font-semibold text-slate-300">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "recipe" : "recipes"}
          </span>
          {(activeFilters > 0 || query) && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 rounded-full border border-red-800 bg-red-900/30 px-3 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-900/50"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Sort pills */}
      <div className="mb-5 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Sort:</span>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`${chipBase} ${sort === opt.value ? chipActive : chipInactive}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <ChefHat className="mx-auto h-16 w-16 text-slate-700" />
          <h3 className="mt-4 text-lg font-semibold text-white">No recipes found</h3>
          <p className="mt-1 text-sm text-slate-400">Try a different search term or clear your filters.</p>
          <button
            onClick={clearAll}
            className="mt-4 rounded-full bg-slate-700 px-5 py-2 text-sm font-medium text-white hover:bg-slate-600"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
