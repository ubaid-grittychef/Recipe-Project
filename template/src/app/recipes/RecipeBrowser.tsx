"use client";

import { useState, useMemo } from "react";
import RecipeCard from "@/components/RecipeCard";
import { Recipe } from "@/lib/types";
import { Search, X, ChefHat } from "lucide-react";

interface Props {
  recipes: Recipe[];
  categories: { name: string; slug: string; count: number }[];
  restaurants: { name: string; slug: string; count: number }[];
}

const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;
type SortOption = "newest" | "rating" | "cook_time" | "word_count";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest",     label: "Newest" },
  { value: "rating",     label: "Top Rated" },
  { value: "cook_time",  label: "Quickest" },
  { value: "word_count", label: "Most Detailed" },
];

function parseMins(str?: string | null): number {
  if (!str) return 999;
  const m = str.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 999;
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition-all duration-150 ${
        active
          ? "border-orange-400 bg-orange-50 text-orange-700 shadow-sm"
          : "border-[#e5e0d8] bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

export default function RecipeBrowser({ recipes, categories, restaurants }: Props) {
  const [query, setQuery]                       = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [sort, setSort]                         = useState<SortOption>("newest");

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

    if (selectedCategory)
      result = result.filter((r) => r.category?.toLowerCase() === selectedCategory.toLowerCase());
    if (selectedRestaurant)
      result = result.filter((r) => r.restaurant_name?.toLowerCase() === selectedRestaurant.toLowerCase());
    if (selectedDifficulty)
      result = result.filter((r) => r.difficulty === selectedDifficulty);

    return [...result].sort((a, b) => {
      switch (sort) {
        case "rating":     return (b.rating ?? 0) - (a.rating ?? 0);
        case "cook_time":  return parseMins(a.total_time || a.cook_time) - parseMins(b.total_time || b.cook_time);
        case "word_count": return (b.word_count ?? 0) - (a.word_count ?? 0);
        default:           return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
    });
  }, [recipes, query, selectedCategory, selectedRestaurant, selectedDifficulty, sort]);

  const activeFilters = [selectedCategory, selectedRestaurant, selectedDifficulty].filter(Boolean).length;

  function clearAll() {
    setQuery("");
    setSelectedCategory(null);
    setSelectedRestaurant(null);
    setSelectedDifficulty(null);
  }

  const hasFilters = categories.length > 0 || restaurants.length > 0;

  return (
    <div>
      {/* ── Search ───────────────────────────────────────── */}
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes by title, ingredient, restaurant…"
          className="w-full rounded-xl border border-[#e5e0d8] bg-white py-3 pl-11 pr-10 text-sm text-slate-900 shadow-sm outline-none transition-all focus:border-orange-300 focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Filters + Sort ───────────────────────────────── */}
      {hasFilters && (
        <div className="mb-6 rounded-xl border border-[#e5e0d8] bg-white p-4 space-y-3">
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Category</span>
              {categories.map((cat) => (
                <Chip
                  key={cat.slug}
                  label={cat.name}
                  active={selectedCategory === cat.name}
                  onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                />
              ))}
            </div>
          )}

          {restaurants.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Restaurant</span>
              {restaurants.slice(0, 10).map((r) => (
                <Chip
                  key={r.slug}
                  label={r.name}
                  active={selectedRestaurant === r.name}
                  onClick={() => setSelectedRestaurant(selectedRestaurant === r.name ? null : r.name)}
                />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Difficulty</span>
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                label={d}
                active={selectedDifficulty === d}
                onClick={() => setSelectedDifficulty(selectedDifficulty === d ? null : d)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Toolbar: sort + count ─────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Sort</span>
          {SORT_OPTIONS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              active={sort === opt.value}
              onClick={() => setSort(opt.value)}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            <span className="font-bold text-slate-900">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "recipe" : "recipes"}
          </span>
          {(activeFilters > 0 || query) && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Recipe grid ──────────────────────────────────── */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#d4cfc7]">
            <ChefHat className="h-9 w-9 text-[#c9bfb0]" />
          </div>
          <h3
            className="text-xl font-black text-slate-900"
            style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
          >
            No recipes found
          </h3>
          <p className="mt-2 text-sm text-slate-500">
            Try a different search or clear your filters.
          </p>
          <button
            onClick={clearAll}
            className="mt-5 rounded-full border border-[#e5e0d8] bg-white px-5 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
