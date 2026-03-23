"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { getBookmarks } from "@/lib/bookmarks";
import RecipeCard from "@/components/RecipeCard";
import { Recipe } from "@/lib/types";

interface FavoritesClientProps {
  allRecipes: Recipe[];
}

export default function FavoritesClient({ allRecipes }: FavoritesClientProps) {
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<string[]>([]);

  useEffect(() => {
    setBookmarkedSlugs(getBookmarks());

    function handleChange() {
      setBookmarkedSlugs(getBookmarks());
    }

    window.addEventListener("bookmarks-changed", handleChange);
    return () => window.removeEventListener("bookmarks-changed", handleChange);
  }, []);

  const savedRecipes = allRecipes.filter(r => bookmarkedSlugs.includes(r.slug));

  return (
    <div className="bg-[#fffdf7] min-h-[60vh]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-orange-500">
            Your Collection
          </p>
          <h1
            className="mt-1 text-2xl font-black text-slate-900 sm:text-3xl"
            style={{ fontFamily: "var(--font-heading), 'Georgia', serif", letterSpacing: "-0.02em" }}
          >
            Saved Recipes
          </h1>
        </div>

        {savedRecipes.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {savedRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#d4cfc7]">
              <Heart className="h-9 w-9 text-[#c9bfb0]" />
            </div>
            <h2
              className="text-2xl font-black text-slate-900"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              No saved recipes yet
            </h2>
            <p className="mt-3 max-w-sm text-slate-500 leading-relaxed">
              Tap the heart icon on any recipe to save it here for quick access later.
            </p>
            <Link
              href="/recipes"
              className="mt-6 rounded-full border border-[#e5e0d8] bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:shadow"
            >
              Browse recipes
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
