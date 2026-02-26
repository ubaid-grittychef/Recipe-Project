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
      ? "bg-emerald-50 text-emerald-700"
      : recipe.difficulty === "Hard"
      ? "bg-red-50 text-red-700"
      : "bg-amber-50 text-amber-700";

  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:shadow-md"
    >
      {/* Image area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ChefHat className="h-12 w-12 text-amber-200 transition-transform group-hover:scale-110" />
          </div>
        )}

        {/* Difficulty badge */}
        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm backdrop-blur-sm ${difficultyColor}`}
        >
          {recipe.difficulty}
        </span>

        {/* Category badge (shown when no restaurant) */}
        {!recipe.restaurant_name && recipe.category && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm backdrop-blur-sm">
            {recipe.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {/* Restaurant + Category tags */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {recipe.restaurant_name && (
            <span className="inline-block rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
              {recipe.restaurant_name}
            </span>
          )}
          {recipe.category && (
            <Link
              href={`/category/${slugifyCategory(recipe.category)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              {recipe.category}
            </Link>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary-600">
          {recipe.title}
        </h3>

        {/* Description */}
        <p className="mt-1.5 line-clamp-2 text-xs text-slate-500 leading-relaxed">
          {recipe.description}
        </p>

        {/* Rating */}
        <div className="mt-2.5 flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-3 w-3 ${
                i < Math.round(rating)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200"
              }`}
            />
          ))}
          <span className="ml-0.5 text-xs font-medium text-slate-600">
            {rating.toFixed(1)}
          </span>
        </div>

        {/* Meta row */}
        <div className="mt-auto flex items-center gap-3 border-t border-slate-50 pt-3 text-xs text-slate-400">
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
