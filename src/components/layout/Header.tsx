"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

const staticTitles: Record<string, string> = {
  "/": "All Projects",
  "/projects/new": "Create New Project",
  "/settings": "Factory Settings",
  "/guide": "Setup Guide",
};

function resolveTitle(pathname: string): string {
  if (staticTitles[pathname]) return staticTitles[pathname];

  if (pathname.match(/^\/projects\/[^/]+\/deploy$/)) return "Deploy & Domains";
  if (pathname.match(/^\/projects\/[^/]+\/settings$/)) return "Project Settings";
  if (pathname.match(/^\/projects\/[^/]+\/recipes\/[^/]+$/)) return "Edit Recipe";
  if (pathname.match(/^\/projects\/[^/]+\/recipes$/)) return "Recipes";
  if (pathname.match(/^\/projects\/[^/]+\/keywords$/)) return "Keywords";
  if (pathname.match(/^\/projects\/[^/]+\/logs$/)) return "Generation Logs";
  if (pathname.match(/^\/projects\/[^/]+$/)) return "Project Details";

  return "Recipe Factory";
}

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const title = resolveTitle(pathname);

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600" />
      </div>
    </header>
  );
}
