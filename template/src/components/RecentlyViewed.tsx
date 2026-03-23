"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, ChefHat } from "lucide-react";
import { getRecentlyViewed, RecentRecipe } from "@/lib/recently-viewed";

interface RecentlyViewedProps {
  excludeSlug?: string;
}

export default function RecentlyViewed({ excludeSlug }: RecentlyViewedProps) {
  const [recipes, setRecipes] = useState<RecentRecipe[]>([]);

  useEffect(() => {
    const all = getRecentlyViewed();
    const filtered = excludeSlug ? all.filter(r => r.slug !== excludeSlug) : all;
    setRecipes(filtered);
  }, [excludeSlug]);

  if (recipes.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-slate-400" />
        <h2
          className="text-xl font-bold text-slate-900 dark:text-slate-100"
          style={{ fontFamily: "var(--font-heading), 'Georgia', serif" }}
        >
          Recently Viewed
        </h2>
      </div>
      <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-thin">
        {recipes.map((recipe) => (
          <Link
            key={recipe.slug}
            href={`/recipe/${recipe.slug}`}
            className="group flex-shrink-0 w-40"
          >
            <div className="relative h-28 w-40 overflow-hidden rounded-lg bg-warm-beige">
              {recipe.image_url ? (
                <Image
                  src={recipe.image_url}
                  alt={recipe.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="160px"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ChefHat className="h-8 w-8 text-warm-muted" />
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-orange-600 transition-colors">
              {recipe.title}
            </p>
            {recipe.total_time && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <Clock className="h-3 w-3" />
                {recipe.total_time}
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
