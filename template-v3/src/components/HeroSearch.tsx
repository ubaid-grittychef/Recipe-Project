"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    },
    [query, router]
  );

  return (
    <form onSubmit={submit} className="flex border-2 border-ink overflow-hidden">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by dish, restaurant or ingredient..."
        className="flex-1 px-4 py-3 text-[14px] text-ink bg-white font-sans outline-none placeholder:text-ink-4"
        aria-label="Search recipes"
      />
      <button
        type="submit"
        className="bg-red text-white px-5 text-[12px] font-extrabold uppercase tracking-[0.8px] hover:bg-red-dark transition-colors whitespace-nowrap shrink-0"
      >
        Search
      </button>
    </form>
  );
}
