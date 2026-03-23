"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { getBookmarkCount } from "@/lib/bookmarks";

export default function BookmarkCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(getBookmarkCount());

    function handleChange() {
      setCount(getBookmarkCount());
    }

    window.addEventListener("bookmarks-changed", handleChange);
    return () => window.removeEventListener("bookmarks-changed", handleChange);
  }, []);

  return (
    <Link
      href="/favorites"
      className="relative rounded-full p-2.5 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center"
      aria-label={`Saved recipes${count > 0 ? ` (${count})` : ""}`}
    >
      <Heart className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[0.625rem] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
