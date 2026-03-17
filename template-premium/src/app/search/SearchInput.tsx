"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function SearchInput({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (value.trim()) {
        router.replace(`/search?q=${encodeURIComponent(value.trim())}`, { scroll: false });
      } else {
        router.replace("/search", { scroll: false });
      }
    }, 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value, router]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search recipes, ingredients, cuisines…"
        className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3.5 pl-11 pr-4 text-sm text-slate-100 shadow-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20 placeholder:text-slate-500"
        autoFocus
      />
    </div>
  );
}
