"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, ChefHat, LogOut, Users } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  "/": { title: "All Projects", subtitle: "Manage your recipe websites" },
  "/projects/new": { title: "New Project", subtitle: "Set up a new recipe site" },
  "/settings": { title: "System Config", subtitle: "API keys and integrations" },
  "/guide": { title: "Setup Guide", subtitle: "Get started step by step" },
};

function resolvePage(pathname: string): { title: string; subtitle?: string } {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.match(/^\/projects\/[^/]+\/deploy$/)) return { title: "Deploy & Domains" };
  if (pathname.match(/^\/projects\/[^/]+\/settings$/)) return { title: "Project Settings" };
  if (pathname.match(/^\/projects\/[^/]+\/recipes\/[^/]+$/)) return { title: "Edit Recipe" };
  if (pathname.match(/^\/projects\/[^/]+\/recipes$/)) return { title: "Recipes" };
  if (pathname.match(/^\/projects\/[^/]+\/queue$/)) return { title: "Keyword Queue" };
  if (pathname.match(/^\/projects\/[^/]+\/analytics$/)) return { title: "Analytics" };
  if (pathname.match(/^\/projects\/[^/]+\/logs$/)) return { title: "Generation Logs" };
  if (pathname.match(/^\/projects\/[^/]+\/keywords$/)) return { title: "Keyword Logs" };
  if (pathname.match(/^\/projects\/[^/]+\/categories$/)) return { title: "Categories" };
  if (pathname.match(/^\/projects\/[^/]+\/restaurants$/)) return { title: "Restaurants" };
  if (pathname.match(/^\/projects\/[^/]+$/)) return { title: "Project Overview" };
  return { title: "Recipe Factory" };
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatHeaderDate() {
  return new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const page = resolvePage(pathname);
  const isHome = pathname === "/";
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Future: global search
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {isHome ? (
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900 leading-tight">
              {getGreeting()} 👋
            </p>
            <p className="text-xs text-slate-400 leading-tight hidden sm:block">{formatHeaderDate()}</p>
          </div>
        ) : (
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">{page.title}</h2>
            {page.subtitle && (
              <p className="text-xs text-slate-400 hidden sm:block">{page.subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Right: search + avatar */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="hidden sm:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anything..."
              className="w-52 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400">/</kbd>
          </div>
        </form>

        {/* Avatar with dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm hover:opacity-90 transition"
            aria-label="User menu"
          >
            <ChefHat className="h-4 w-4 text-white" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
              <button
                onClick={() => { setMenuOpen(false); router.push("/admin/users"); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
              >
                <Users className="h-4 w-4 text-slate-400" />
                Manage Users
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
