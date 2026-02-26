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

export default function RecipeBrowser({ recipes, categories, restaurants }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

    if (selectedCategory) {
      result = result.filter(
        (r) => r.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedRestaurant) {
      result = result.filter(
        (r) => r.restaurant_name?.toLowerCase() === selectedRestaurant.toLowerCase()
      );
    }

    if (selectedDifficulty) {
      result = result.filter((r) => r.difficulty === selectedDifficulty);
    }

    return result;
  }, [recipes, query, selectedCategory, selectedRestaurant, selectedDifficulty]);

  const activeFilters =
    [selectedCategory, selectedRestaurant, selectedDifficulty].filter(Boolean).length;

  function clearAll() {
    setQuery("");
    setSelectedCategory(null);
    setSelectedRestaurant(null);
    setSelectedDifficulty(null);
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes by title, ingredient, keyword…"
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Mobile filter toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors sm:hidden ${
            activeFilters > 0
              ? "border-primary-300 bg-primary-50 text-primary-700"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilters > 0 && (
            <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-xs text-white">
              {activeFilters}
            </span>
          )}
        </button>

        {/* Desktop filter chips — always visible */}
        <div className={`flex flex-wrap gap-2 ${filtersOpen ? "flex" : "hidden sm:flex"}`}>
          {/* Category chips */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory === cat.name ? null : cat.name
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategory === cat.name
                      ? "border-primary-400 bg-primary-50 text-primary-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Restaurant chips */}
          {restaurants.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                Restaurant:
              </span>
              {restaurants.slice(0, 8).map((r) => (
                <button
                  key={r.slug}
                  onClick={() =>
                    setSelectedRestaurant(
                      selectedRestaurant === r.name ? null : r.name
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedRestaurant === r.name
                      ? "border-primary-400 bg-primary-50 text-primary-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          {/* Difficulty chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="self-center text-xs font-semibold uppercase tracking-wide text-slate-400">
              Difficulty:
            </span>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() =>
                  setSelectedDifficulty(selectedDifficulty === d ? null : d)
                }
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selectedDifficulty === d
                    ? "border-primary-400 bg-primary-50 text-primary-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Result count + clear */}
        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-slate-500">
            <span className="font-semibold text-slate-800">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "recipe" : "recipes"}
          </span>
          {(activeFilters > 0 || query) && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Recipe grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <ChefHat className="mx-auto h-16 w-16 text-slate-200" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            No recipes found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Try a different search term or clear your filters.
          </p>
          <button
            onClick={clearAll}
            className="mt-4 rounded-full bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
