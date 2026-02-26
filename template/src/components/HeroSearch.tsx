"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { siteConfig } from "@/lib/config";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-10 flex max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/10"
    >
      <label htmlFor="hero-search" className="sr-only">
        Search recipes
      </label>
      <div className="flex flex-1 items-center gap-3 px-5">
        <Search className="h-5 w-5 shrink-0 text-slate-400" />
        <input
          id="hero-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes, ingredients, cuisines…"
          className="flex-1 py-4 text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
      <button
        type="submit"
        className="m-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow transition-opacity hover:opacity-90"
        style={{ backgroundColor: siteConfig.primaryColor }}
      >
        Search
      </button>
    </form>
  );
}
