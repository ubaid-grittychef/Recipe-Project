"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, Search, ChefHat, LogOut } from "lucide-react";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const supabase = createSupabaseBrowserClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    // Future: global search
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden shrink-0"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {isHome ? (
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground leading-tight">
              {getGreeting()}
            </p>
            <p className="text-xs text-muted-foreground leading-tight hidden sm:block">{formatHeaderDate()}</p>
          </div>
        ) : (
          <div className="min-w-0">
            <h2 className="text-base font-bold text-foreground truncate">{page.title}</h2>
            {page.subtitle && (
              <p className="text-xs text-muted-foreground hidden sm:block">{page.subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Right: search + avatar */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="hidden sm:flex items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search anything..."
              className="w-52 rounded-lg border border-input bg-secondary py-1.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">/</kbd>
          </div>
        </form>

        {/* Avatar with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 shadow-sm hover:opacity-90 transition"
              aria-label="User menu"
            >
              <ChefHat className="h-4 w-4 text-white" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
