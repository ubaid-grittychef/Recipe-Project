"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Search } from "lucide-react";
import { siteConfig } from "@/lib/config";

const navLinks = [
  { href: "/recipes", label: "Recipes" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="site-header sticky top-0 z-50 bg-white border-b-[3px] border-ink">
        <div className="max-w-site mx-auto px-6 h-[56px] flex items-center gap-0">
          {/* Logo */}
          <Link
            href="/"
            aria-label={`${siteConfig.name} home`}
            className="font-serif text-[20px] font-black text-ink tracking-[-0.5px] mr-10 pr-10 border-r border-rule shrink-0"
          >
            {siteConfig.name}
            <sup className="text-red text-[12px] ml-0.5" style={{ verticalAlign: "super" }}>™</sup>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-stretch h-full flex-1" aria-label="Main navigation">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`sweep-red relative flex items-center px-4 text-[12px] font-bold uppercase tracking-[0.5px] border-r border-rule transition-colors ${
                    active ? "text-ink" : "text-ink-3 hover:text-ink"
                  }`}
                  style={active ? { borderBottom: "3px solid #c8000a", marginBottom: "-3px" } : {}}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Search + mobile toggle */}
          <div className="flex items-center gap-3 ml-auto">
            <Link
              href="/search"
              className="hidden md:flex items-center gap-2 border border-rule bg-bg-2 px-3 py-1.5 text-[12px] text-ink-4 hover:border-ink transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              Search recipes...
              <kbd className="ml-2 bg-white border border-rule px-1.5 py-0.5 text-[10px] font-sans">/</kbd>
            </Link>

            <button
              className="md:hidden p-1.5 text-ink"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t-[3px] border-ink bg-white" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.5px] text-ink-2 border-b border-rule hover:text-red transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/search"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.5px] text-ink-3 hover:text-red transition-colors"
            >
              <Search className="h-4 w-4" /> Search
            </Link>
          </nav>
        )}
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
