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
    <div className="flex border-[2px] border-ink bg-white">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-4" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search by dish, restaurant or ingredient..."
          className="w-full bg-transparent py-4 pl-11 pr-4 text-[14px] font-sans text-ink placeholder:text-ink-4 outline-none"
          autoFocus
        />
      </div>
      <div className="bg-red px-6 flex items-center">
        <Search className="h-4 w-4 text-white" />
      </div>
    </div>
  );
}
