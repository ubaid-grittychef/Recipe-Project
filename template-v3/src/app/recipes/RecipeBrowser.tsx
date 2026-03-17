"use client";

import { useState, useMemo } from "react";
import { X } from "lucide-react";
import RecipeCard from "@/components/RecipeCard";
import type { Recipe } from "@/lib/types";

type SortKey = "newest" | "rating" | "quickest";

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

interface Props {
  recipes: Recipe[];
  categories: string[];
}

export default function RecipeBrowser({ recipes, categories }: Props) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("");
  const [diff, setDiff] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const filtered = useMemo(() => {
    let list = [...recipes];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.restaurant_name?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q)
      );
    }
    if (cat) list = list.filter((r) => r.category?.toLowerCase() === cat.toLowerCase());
    if (diff) list = list.filter((r) => r.difficulty?.toLowerCase() === diff.toLowerCase());

    if (sort === "rating") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sort === "quickest") {
      list.sort((a, b) => {
        const parse = (t?: string) => parseInt(t ?? "999");
        return parse(a.total_time) - parse(b.total_time);
      });
    }
    // "newest" — keep original order (API returns newest first)
    return list;
  }, [recipes, search, cat, diff, sort]);

  const hasFilters = !!search || !!cat || !!diff;

  const clearAll = () => { setSearch(""); setCat(""); setDiff(""); };

  return (
    <div className="max-w-site mx-auto px-6 py-10">
      {/* Filter bar */}
      <div className="border border-rule bg-white p-5 mb-8">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 block mb-2">Search</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Dish, restaurant..."
              className="w-full border border-rule px-3 py-2 text-[13px] font-sans text-ink bg-bg placeholder:text-ink-4 outline-none focus:border-ink transition-colors"
            />
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <label className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 block mb-2">Category</label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="border border-rule px-3 py-2 text-[13px] font-sans text-ink bg-white outline-none focus:border-ink transition-colors pr-8"
              >
                <option value="">All</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {/* Difficulty */}
          <div>
            <label className="text-[9px] font-extrabold uppercase tracking-[2px] text-ink-4 block mb-2">Difficulty</label>
            <div className="flex gap-1">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDiff(diff === d ? "" : d)}
                  className={`px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.5px] border transition-colors ${
                    diff === d
                      ? "bg-ink text-white border-ink"
                      : "bg-white text-ink-3 border-rule hover:border-ink"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 text-[11px] font-bold text-red hover:text-red-dark uppercase tracking-[0.5px]"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Sort + count row */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-[12px] font-bold text-ink-4 uppercase tracking-[1px]">
          {filtered.length} {filtered.length === 1 ? "recipe" : "recipes"}
        </p>
        <div className="flex gap-1">
          {(["newest", "rating", "quickest"] as SortKey[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.5px] border transition-colors ${
                sort === s
                  ? "bg-red text-white border-red"
                  : "bg-white text-ink-3 border-rule hover:border-ink"
              }`}
            >
              {s === "newest" ? "Newest" : s === "rating" ? "Top Rated" : "Quickest"}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-rule">
          {filtered.map((r, i) => {
            const col = i % 3;
            const isLastCol = col === 2;
            return (
              <div key={r.id} className={`${!isLastCol ? "border-r border-rule" : ""} ${i >= 3 ? "border-t border-rule" : ""}`}>
                <RecipeCard recipe={r} rank={i + 1} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-rule py-20 text-center">
          <p className="font-serif text-[24px] font-black text-ink-4 mb-2">No recipes found</p>
          <p className="text-[14px] text-ink-4">Try adjusting your filters.</p>
          {hasFilters && (
            <button onClick={clearAll} className="btn-outline mt-6">Clear filters</button>
          )}
        </div>
      )}
    </div>
  );
}
