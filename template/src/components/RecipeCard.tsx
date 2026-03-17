"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Users, ChefHat } from "lucide-react";
import { Recipe } from "@/lib/types";
import { slugifyCategory } from "@/lib/utils";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
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
      className="group flex flex-col overflow-hidden rounded-xl bg-white border border-[#ede8e0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] hover:border-[#d4cfc7]"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#f5f0e8]">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={`${recipe.title} recipe`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="h-10 w-10 text-[#c9bfb0]" />
          </div>
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />

        {/* Category pill */}
        {(recipe.category || recipe.restaurant_name) && (
          <div className="absolute top-3 left-3">
            <span className="rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-700 shadow-sm">
              {recipe.category || recipe.restaurant_name}
            </span>
          </div>
        )}

        {/* Difficulty */}
        {recipe.difficulty && (
          <div className="absolute bottom-3 right-3">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${diff.cls} shadow-sm`}>
              {diff.label}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4 pt-3.5">
        {/* Restaurant tag */}
        {recipe.restaurant_name && recipe.category && (
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-orange-500">
            {recipe.restaurant_name}
          </p>
        )}

        {/* Title */}
        <h3
          className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-orange-600"
          style={{ fontFamily: "var(--font-heading), 'Georgia', serif" }}
        >
          {recipe.title}
        </h3>

        {/* Description */}
        {recipe.description && (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-500">
            {recipe.description}
          </p>
        )}

        {/* Meta */}
        <div className="mt-auto flex items-center gap-3 border-t border-[#ede8e0] pt-3 text-[12px] text-slate-400 mt-3">
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
