"use client";

import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import AffiliateLink from "./AffiliateLink";
import { siteConfig } from "@/lib/config";

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
}

interface Props {
  ingredients: Ingredient[];
}

export default function IngredientsChecklist({ ingredients }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <ul className="space-y-2">
      {ingredients.map((ing, i) => {
        const isDone = checked.has(i);
        return (
          <li
            key={i}
            className={`flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 px-4 py-3 transition-colors ${isDone ? "bg-slate-50 dark:bg-slate-800/50" : ""}`}
          >
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => toggle(i)}
                className="h-4 w-4 rounded border-slate-300 accent-orange-500"
              />
              <span className={isDone ? "text-slate-400 line-through" : "text-slate-700 dark:text-slate-300"}>
                <span className={isDone ? "font-medium" : "font-medium"}>
                  {ing.quantity} {ing.unit}
                </span>{" "}
                {ing.name}
              </span>
            </label>
            {siteConfig.amazonTag && (
              <AffiliateLink
                href={`https://www.amazon.com/s?k=${encodeURIComponent(ing.name)}&tag=${siteConfig.amazonTag}`}
                type="amazon"
                label={ing.name}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-500"
              >
                <ShoppingCart className="h-3 w-3" />
                Amazon
              </AffiliateLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
