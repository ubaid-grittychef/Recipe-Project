"use client";

import { useEffect } from "react";
import { addRecentlyViewed, RecentRecipe } from "@/lib/recently-viewed";

interface RecentlyViewedTrackerProps {
  recipe: RecentRecipe;
}

export default function RecentlyViewedTracker({ recipe }: RecentlyViewedTrackerProps) {
  useEffect(() => {
    addRecentlyViewed(recipe);
  }, [recipe.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
