"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart } from "lucide-react";
import { isBookmarked, toggleBookmark } from "@/lib/bookmarks";

interface BookmarkButtonProps {
  slug: string;
  size?: "sm" | "md";
}

export default function BookmarkButton({ slug, size = "sm" }: BookmarkButtonProps) {
  const [saved, setSaved] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(slug));
  }, [slug]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleBookmark(slug);
    setSaved(nowSaved);
    setAnimate(true);
    setTimeout(() => setAnimate(false), 200);
  }, [slug]);

  const btnSize = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      onClick={handleClick}
      className={`${btnSize} flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 hover:bg-white ${
        saved ? "text-red-500" : "text-slate-400 hover:text-red-400"
      }`}
      aria-label={saved ? "Remove from saved recipes" : "Save recipe"}
    >
      <Heart
        className={`${iconSize} transition-transform duration-200 ${animate ? "scale-125" : "scale-100"}`}
        fill={saved ? "currentColor" : "none"}
      />
    </button>
  );
}
