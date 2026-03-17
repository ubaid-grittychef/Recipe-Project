"use client";

import { useState } from "react";
import type { Ingredient } from "@/lib/types";

interface Props {
  ingredients: Ingredient[];
}

export default function IngredientsChecklist({ ingredients }: Props) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  return (
    <ul role="list" className="divide-y divide-rule-light">
      {ingredients.map((ing, i) => {
        const done = checked.has(i);
        return (
          <li
            key={i}
            onClick={() => toggle(i)}
            className={`flex items-start gap-3 py-2.5 cursor-pointer select-none transition-opacity ${done ? "opacity-40" : ""}`}
          >
            {/* Square checkbox */}
            <div
              className={`mt-0.5 w-[18px] h-[18px] shrink-0 border flex items-center justify-center transition-colors ${
                done ? "bg-red border-red" : "bg-white border-rule"
              }`}
            >
              {done && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            <span className={`text-[14px] text-ink-2 leading-snug ${done ? "line-through" : ""}`}>
              {ing.quantity && (
                <strong className="font-bold text-ink min-w-[56px] inline-block mr-1">
                  {ing.quantity}
                </strong>
              )}
              {ing.unit && <span className="text-ink-3 mr-1">{ing.unit}</span>}
              {ing.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
