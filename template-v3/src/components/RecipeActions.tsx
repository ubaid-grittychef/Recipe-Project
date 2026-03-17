"use client";

import { Printer, Share2, Bookmark } from "lucide-react";

export default function RecipeActions({ title }: { title: string }) {
  const handlePrint = () => window.print();

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(window.location.href).catch(() => {});
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="flex items-center gap-2 no-print">
      <button onClick={handlePrint} className="btn-outline flex items-center gap-1.5 text-[11px] py-2 px-3">
        <Printer className="h-3.5 w-3.5" /> Print
      </button>
      <button onClick={handleShare} className="btn-outline flex items-center gap-1.5 text-[11px] py-2 px-3">
        <Share2 className="h-3.5 w-3.5" /> Share
      </button>
      <button className="btn-red flex items-center gap-1.5 text-[11px] py-2 px-3">
        <Bookmark className="h-3.5 w-3.5" /> Save Recipe
      </button>
    </div>
  );
}
