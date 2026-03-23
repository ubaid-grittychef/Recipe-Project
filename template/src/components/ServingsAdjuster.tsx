"use client";

import { Minus, Plus } from "lucide-react";

interface Props {
  servings: number;
  onChange: (servings: number) => void;
}

export default function ServingsAdjuster({ servings, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, servings - 1))}
        disabled={servings <= 1}
        className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Decrease servings"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="font-semibold text-lg min-w-[2ch] text-center">{servings}</span>
      <button
        onClick={() => onChange(servings + 1)}
        className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Increase servings"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
