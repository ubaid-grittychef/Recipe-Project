"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import RecipeCard from "@/components/RecipeCard";
import Pagination from "@/components/Pagination";
import { Recipe } from "@/lib/types";
import { Search, X, ChefHat } from "lucide-react";
import {
  TimeRange,
  TIME_RANGES,
  matchesTimeRange,
  DietaryLabel,
  deriveDietaryLabels,
  Cuisine,
  deriveCuisine,
} from "@/lib/filters";

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

const RECIPES_PER_PAGE = 12;

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
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
        active
          ? "border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 shadow-sm"
          : "border-warm-border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
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
  const [currentPage, setCurrentPage]           = useState(1);

  // New filter state
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange | null>(null);
  const [selectedDietary, setSelectedDietary]     = useState<DietaryLabel[]>([]);
  const [selectedCuisine, setSelectedCuisine]     = useState<Cuisine | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  // Pre-compute dietary labels and cuisine for all recipes
  const recipeMeta = useMemo(() => {
    const metaMap = new Map<string, { dietary: DietaryLabel[]; cuisine: Cuisine | null }>();
    recipes.forEach((r) => {
      metaMap.set(r.id, {
        dietary: deriveDietaryLabels(r),
        cuisine: deriveCuisine(r),
      });
    });
    return metaMap;
  }, [recipes]);

  // Compute available filter options from the full recipe set
  const availableDietary = useMemo(() => {
    const all = new Set<DietaryLabel>();
    recipeMeta.forEach((m) => m.dietary.forEach((d) => all.add(d)));
    return Array.from(all);
  }, [recipeMeta]);

  const availableCuisines = useMemo(() => {
    const all = new Set<Cuisine>();
    recipeMeta.forEach((m) => { if (m.cuisine) all.add(m.cuisine); });
    return Array.from(all).sort();
  }, [recipeMeta]);

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

    // Time range filter
    if (selectedTimeRange)
      result = result.filter((r) => matchesTimeRange(r, selectedTimeRange));

    // Dietary filter (all selected labels must match)
    if (selectedDietary.length > 0)
      result = result.filter((r) => {
        const meta = recipeMeta.get(r.id);
        if (!meta) return false;
        return selectedDietary.every((d) => meta.dietary.includes(d));
      });

    // Cuisine filter
    if (selectedCuisine)
      result = result.filter((r) => {
        const meta = recipeMeta.get(r.id);
        return meta?.cuisine === selectedCuisine;
      });

    return [...result].sort((a, b) => {
      switch (sort) {
        case "rating":     return (b.rating ?? 0) - (a.rating ?? 0);
        case "cook_time":  return parseMins(a.total_time || a.cook_time) - parseMins(b.total_time || b.cook_time);
        case "word_count": return (b.word_count ?? 0) - (a.word_count ?? 0);
        default:           return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      }
    });
  }, [recipes, query, selectedCategory, selectedRestaurant, selectedDifficulty, sort, selectedTimeRange, selectedDietary, selectedCuisine, recipeMeta]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / RECIPES_PER_PAGE);
  const paginatedRecipes = filtered.slice(
    (currentPage - 1) * RECIPES_PER_PAGE,
    currentPage * RECIPES_PER_PAGE
  );

  // Reset page to 1 when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedCategory, selectedRestaurant, selectedDifficulty, selectedTimeRange, selectedDietary, selectedCuisine]);

  // Scroll to top of grid when page changes (but not on filter-triggered resets)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (gridRef.current) {
      gridRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentPage]);

  const activeFilters = [
    selectedCategory,
    selectedRestaurant,
    selectedDifficulty,
    selectedTimeRange,
    selectedCuisine,
  ].filter(Boolean).length + selectedDietary.length;

  function clearAll() {
    setQuery("");
    setSelectedCategory(null);
    setSelectedRestaurant(null);
    setSelectedDifficulty(null);
    setSelectedTimeRange(null);
    setSelectedDietary([]);
    setSelectedCuisine(null);
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
          className="w-full rounded-xl border border-warm-border bg-white dark:bg-slate-800 py-3 pl-11 pr-10 text-sm text-slate-900 dark:text-slate-100 shadow-sm outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-100 dark:focus:ring-primary-900/30 placeholder:text-slate-400"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Filters + Sort ───────────────────────────────── */}
      {hasFilters && (
        <div className="mb-6 rounded-xl border border-warm-border bg-white dark:bg-slate-900 p-4 space-y-3">
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Category</span>
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
              <span className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Restaurant</span>
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
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Difficulty</span>
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                label={d}
                active={selectedDifficulty === d}
                onClick={() => setSelectedDifficulty(selectedDifficulty === d ? null : d)}
              />
            ))}
          </div>

          {/* Time Range */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Time</span>
            {TIME_RANGES.map((range) => (
              <button
                key={range.key}
                onClick={() => setSelectedTimeRange((prev) => prev === range.key ? null : range.key)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                  selectedTimeRange === range.key
                    ? "bg-sky-50 dark:bg-sky-950/30 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-400 shadow-sm"
                    : "border-warm-border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Dietary */}
          {availableDietary.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Dietary</span>
              {availableDietary.map((label) => (
                <button
                  key={label}
                  onClick={() =>
                    setSelectedDietary((prev) =>
                      prev.includes(label) ? prev.filter((d) => d !== label) : [...prev, label]
                    )
                  }
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                    selectedDietary.includes(label)
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 shadow-sm"
                      : "border-warm-border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Cuisine */}
          {availableCuisines.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-slate-400 w-20 shrink-0">Cuisine</span>
              {availableCuisines.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => setSelectedCuisine((prev) => prev === cuisine ? null : cuisine)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                    selectedCuisine === cuisine
                      ? "bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400 shadow-sm"
                      : "border-warm-border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Toolbar: sort + count ─────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.625rem] font-bold uppercase tracking-[0.15em] text-slate-400">Sort</span>
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
            <span className="font-bold text-slate-900 dark:text-slate-100">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "recipe" : "recipes"}
          </span>
          {(activeFilters > 0 || query) && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 rounded-full border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-100 dark:hover:bg-red-900/40"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Recipe grid ──────────────────────────────────── */}
      <div ref={gridRef}>
        {filtered.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              itemsPerPage={RECIPES_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <div className="py-24 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-warm-border-dark">
              <ChefHat className="h-9 w-9 text-warm-muted" />
            </div>
            <h3
              className="text-xl font-black text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              No recipes found
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Try a different search or clear your filters.
            </p>
            <button
              onClick={clearAll}
              className="mt-5 rounded-full border border-warm-border bg-white dark:bg-slate-800 px-5 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 shadow-sm transition-all hover:border-slate-300 hover:shadow"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
