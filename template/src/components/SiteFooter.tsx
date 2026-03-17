"use client";

import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { ChefHat } from "lucide-react";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Top accent */}
      <div className="h-[3px] w-full" style={{ backgroundColor: siteConfig.primaryColor }} />

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">

          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white shadow-sm"
                style={{ backgroundColor: siteConfig.primaryColor }}
              >
                <ChefHat className="h-5 w-5" />
              </div>
              <span
                className="text-lg font-black text-white"
                style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
              >
                {siteConfig.name}
              </span>
            </Link>

            {siteConfig.description && (
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
                {siteConfig.description}
              </p>
            )}

            {siteConfig.tagline && !siteConfig.description && (
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
                {siteConfig.tagline}
              </p>
            )}
          </div>

          {/* Explore */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Explore
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/", label: "Home" },
                { href: "/recipes", label: "All Recipes" },
                { href: "/categories", label: "Categories" },
                { href: "/search", label: "Search" },
                { href: "/about", label: "About" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {[
                { href: "/privacy", label: "Privacy Policy" },
                { href: "/terms", label: "Terms of Use" },
                { href: "/sitemap", label: "Sitemap" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 text-[12px] text-slate-600 sm:flex-row">
          <p>© {year} {siteConfig.name}. All rights reserved.</p>
          <p className="italic">Restaurant-quality recipes at home.</p>
        </div>
      </div>
    </footer>
  );
}
