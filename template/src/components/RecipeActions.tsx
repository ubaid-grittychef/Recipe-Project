"use client";

import { Printer, Share2 } from "lucide-react";

interface Props {
  title: string;
  variant?: "default" | "light";
}

export default function RecipeActions({ title, variant = "default" }: Props) {
  const isLight = variant === "light";

  const btnClass = isLight
    ? "flex items-center gap-1.5 rounded-lg border border-white/30 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
    : "flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800";

  return (
    <div className={isLight ? "flex gap-2" : "flex gap-2"}>
      <button onClick={() => window.print()} className={btnClass}>
        <Printer className="h-3.5 w-3.5" />
        Print
      </button>
      <button
        onClick={() => {
          if (navigator.share) {
            navigator.share({ title, url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
        className={btnClass}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </button>
    </div>
  );
}
