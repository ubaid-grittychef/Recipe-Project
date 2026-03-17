"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { ChefHat, Menu, X, Search } from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/recipes", label: "Recipes" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function openSearch() {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }

  return (
    <header className={`sticky top-0 z-50 bg-[#fffdf7] transition-all duration-200 ${scrolled ? "shadow-[0_1px_0_0_#e5e0d8,0_2px_8px_0_rgba(0,0,0,0.06)]" : "border-b border-[#e5e0d8]"}`}>
      {/* Top accent bar */}
      <div className="h-[3px] w-full" style={{ backgroundColor: siteConfig.primaryColor }} />

      <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 group">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm transition-transform duration-200 group-hover:scale-105"
            style={{ backgroundColor: siteConfig.primaryColor }}
          >
            <ChefHat className="h-4.5 w-4.5 h-[18px] w-[18px]" />
          </div>
          <span
            className="text-[17px] font-black text-slate-900 tracking-tight leading-none"
            style={{ fontFamily: "var(--font-heading), 'Georgia', serif" }}
          >
            {siteConfig.name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center sm:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em] transition-colors ${
                  active ? "text-slate-900" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {link.label}
                {active && (
                  <span
                    className="absolute inset-x-4 -bottom-[1px] h-[2px] rounded-full"
                    style={{ backgroundColor: siteConfig.primaryColor }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          {searchOpen ? (
            <form
              onSubmit={handleSearchSubmit}
              className="hidden items-center gap-0 overflow-hidden rounded-full border border-[#e5e0d8] bg-white ring-2 ring-orange-100 sm:flex"
            >
              <Search className="ml-3.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recipes…"
                className="w-44 bg-transparent px-2.5 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="mr-2 rounded-full p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={openSearch}
              className="hidden rounded-full p-2.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:flex items-center justify-center"
              aria-label="Search recipes"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
          )}

          <Link href="/search" className="rounded-full p-2.5 text-slate-500 hover:bg-slate-100 sm:hidden">
            <Search className="h-[18px] w-[18px]" />
          </Link>

          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg p-2.5 text-slate-500 hover:bg-slate-100 sm:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-[#e5e0d8] bg-[#fffdf7] px-4 pb-4 pt-2 sm:hidden">
          <nav className="space-y-0.5">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wide transition-colors ${
                    active
                      ? "bg-orange-50 text-orange-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <form
            onSubmit={handleSearchSubmit}
            className="mt-3 flex items-center gap-2 rounded-xl border border-[#e5e0d8] bg-white px-4 py-2.5"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipes…"
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
          </form>
        </div>
      )}
    </header>
  );
}
