"use client";

import { useState, useEffect } from "react";
import { ChefHat, Printer, Star } from "lucide-react";

interface StickyRecipeBarProps {
  title: string;
  rating?: number | null;
}

export default function StickyRecipeBar({ title, rating }: StickyRecipeBarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-warm-border bg-warm-cream/95 backdrop-blur-sm transition-transform duration-300 print:hidden"
      data-print-hide
    >
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 min-w-0">
          <ChefHat className="h-5 w-5 shrink-0 text-primary-500" />
          <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100 font-heading">
            {title}
          </span>
          {rating && (
            <span className="hidden items-center gap-1 text-sm font-semibold text-amber-500 sm:flex">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {rating}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              const el = document.getElementById("recipe-card");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-full bg-primary-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary-600 transition-colors"
          >
            Jump to Recipe
          </button>
          <button
            onClick={() => window.print()}
            className="hidden rounded-full border border-warm-border p-2 text-slate-500 hover:bg-warm-sand transition-colors sm:flex"
            aria-label="Print recipe"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
