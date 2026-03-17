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
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors"
            style={{ backgroundColor: isDone ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)" }}
          >
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => toggle(i)}
                className="h-4 w-4 shrink-0 rounded accent-orange-500"
              />
              <span className={`min-w-0 ${isDone ? "text-slate-600 line-through" : "text-slate-300"}`}>
                <span className={isDone ? "font-semibold text-slate-600" : "font-semibold text-white"}>
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
                className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-500 px-2 py-1 text-[10px] font-bold text-white hover:bg-amber-400"
              >
                <ShoppingCart className="h-3 w-3" />
                Buy
              </AffiliateLink>
            )}
          </li>
        );
      })}
    </ul>
  );
}
