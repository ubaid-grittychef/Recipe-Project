"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import ServingsAdjuster from "./ServingsAdjuster";
import IngredientsChecklist from "./IngredientsChecklist";
import { parseQuantity, formatQuantity } from "@/lib/utils";
import type { Ingredient } from "@/lib/types";

interface Props {
  originalServings: number;
  ingredients: Ingredient[];
}

export default function RecipeIngredientSection({ originalServings, ingredients }: Props) {
  const [currentServings, setCurrentServings] = useState(originalServings);

  const ratio = currentServings / originalServings;

  const scaledIngredients = ingredients.map((ing) => {
    const parsed = parseQuantity(ing.quantity);
    if (parsed === null) {
      return ing;
    }
    const scaled = parsed * ratio;
    return {
      ...ing,
      quantity: formatQuantity(scaled),
    };
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Ingredients</h2>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          <ServingsAdjuster servings={currentServings} onChange={setCurrentServings} />
        </div>
      </div>
      {currentServings !== originalServings && (
        <p className="mb-3 text-xs text-slate-400">
          Adjusted from {originalServings} to {currentServings} servings
        </p>
      )}
      <IngredientsChecklist ingredients={scaledIngredients} />
    </div>
  );
}
