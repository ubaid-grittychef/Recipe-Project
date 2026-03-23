"use client";

import { useState } from "react";
import Link from "next/link";
import { Clock, Users, ChefHat } from "lucide-react";
import { Recipe } from "@/lib/types";
import { slugifyCategory } from "@/lib/utils";
import BookmarkButton from "@/components/BookmarkButton";
import ImageSkeleton from "@/components/ImageSkeleton";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const [imgError, setImgError] = useState(false);
  const totalTime = recipe.total_time || recipe.cook_time || recipe.prep_time;

  const difficultyConfig: Record<string, { label: string; cls: string }> = {
    Easy:   { label: "Easy",   cls: "bg-emerald-100 text-emerald-700" },
    Medium: { label: "Medium", cls: "bg-amber-100 text-amber-700" },
    Hard:   { label: "Hard",   cls: "bg-red-100 text-red-700" },
  };
  const diff = difficultyConfig[recipe.difficulty ?? ""] ?? { label: recipe.difficulty ?? "", cls: "bg-slate-100 text-slate-600" };

  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-warm-border-light shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:border-warm-border-dark"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-warm-beige">
        {recipe.image_url && !imgError ? (
          <ImageSkeleton
            src={recipe.image_url}
            alt={`${recipe.title} recipe`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="h-10 w-10 text-warm-muted" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Category pill */}
        {(recipe.category || recipe.restaurant_name) && (
          <div className="absolute top-3 left-3">
            <span className="rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm">
              {recipe.category || recipe.restaurant_name}
            </span>
          </div>
        )}

        {/* Difficulty */}
        {recipe.difficulty && (
          <div className="absolute bottom-3 right-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${diff.cls} shadow-sm`}>
              {diff.label}
            </span>
          </div>
        )}

        {/* Bookmark */}
        <div className="absolute top-3 right-3">
          <BookmarkButton slug={recipe.slug} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 pt-3">
        {/* Restaurant tag */}
        {recipe.restaurant_name && recipe.category && (
          <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.08em] text-orange-500">
            {recipe.restaurant_name}
          </p>
        )}

        {/* Title */}
        <h3
          className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 dark:text-slate-100 transition-colors group-hover:text-orange-600"
          style={{ fontFamily: "var(--font-heading), 'Georgia', serif" }}
        >
          {recipe.title}
        </h3>

        {/* Description */}
        {recipe.description && (
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {recipe.description}
          </p>
        )}

        {/* Meta */}
        <div className="mt-auto flex items-center gap-3 border-t border-warm-border-light pt-3 text-xs text-slate-400 mt-3">
          {totalTime && (
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-slate-300" />
              {totalTime}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-300" />
            {recipe.servings} {recipe.servings === 1 ? "serving" : "servings"}
          </span>
          {recipe.rating && (
            <span className="ml-auto font-bold text-amber-500">★ {recipe.rating}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
