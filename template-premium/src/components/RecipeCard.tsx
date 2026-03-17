"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Users, Star, ChefHat } from "lucide-react";
import { Recipe } from "@/lib/types";
import { slugifyCategory } from "@/lib/utils";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const rating = recipe.rating ?? 4.8;
  const totalTime = recipe.total_time || recipe.cook_time || recipe.prep_time;

  const difficultyColor =
    recipe.difficulty === "Easy"
      ? "bg-emerald-900 text-emerald-200"
      : recipe.difficulty === "Hard"
      ? "bg-red-900 text-red-200"
      : "bg-amber-900 text-amber-200";

  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={`${recipe.title} recipe`}
            fill
            className="object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-90"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="h-12 w-12 text-slate-600 transition-transform group-hover:scale-110" />
          </div>
        )}

        {!recipe.restaurant_name && recipe.category && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[11px] font-medium text-slate-300 backdrop-blur-sm">
            {recipe.category}
          </span>
        )}

        {/* Difficulty badge bottom-left (WCAG AA contrast) */}
        <span className={`absolute bottom-2 left-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm ${difficultyColor}`}>
          {recipe.difficulty}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {recipe.restaurant_name && (
            <span className="inline-block rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              {recipe.restaurant_name}
            </span>
          )}
          {recipe.category && (
            <Link
              href={`/category/${slugifyCategory(recipe.category)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-block rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
            >
              {recipe.category}
            </Link>
          )}
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold text-slate-100 group-hover:text-white">
          {recipe.title}
        </h3>

        <p className="mt-1.5 line-clamp-3 text-xs text-slate-500 leading-relaxed">
          {recipe.description}
        </p>

        <div className="mt-2.5 flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-slate-700 text-slate-700"}`}
            />
          ))}
          <span className="ml-0.5 text-xs font-medium text-slate-400">{rating.toFixed(1)}</span>
        </div>

        <div className="mt-auto flex items-center gap-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {totalTime || "—"}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {recipe.servings} servings
          </span>
        </div>
      </div>
    </Link>
  );
}
