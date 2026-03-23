"use client";

import Link from "next/link";
import { siteConfig } from "@/lib/config";
import { ChefHat, Instagram, Facebook, Youtube, Twitter } from "lucide-react";
import NewsletterSignup from "./NewsletterSignup";

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

            {/* Newsletter signup */}
            <div className="mt-4">
              <p className="text-sm text-slate-400 mb-2">Get recipes in your inbox</p>
              <NewsletterSignup variant="inline" />
            </div>

            {/* Social Links */}
            {(siteConfig.instagram || siteConfig.facebook || siteConfig.pinterest || siteConfig.youtube || siteConfig.twitter || siteConfig.tiktok) && (
              <div className="flex gap-3 mt-4">
                {siteConfig.instagram && (
                  <a href={siteConfig.instagram} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" aria-label="Instagram">
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.facebook && (
                  <a href={siteConfig.facebook} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" aria-label="Facebook">
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.youtube && (
                  <a href={siteConfig.youtube} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" aria-label="YouTube">
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.twitter && (
                  <a href={siteConfig.twitter} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" aria-label="Twitter">
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {siteConfig.pinterest && (
                  <a href={siteConfig.pinterest} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" aria-label="Pinterest">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
                    </svg>
                  </a>
                )}
                {siteConfig.tiktok && (
                  <a href={siteConfig.tiktok} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors" aria-label="TikTok">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.6a8.21 8.21 0 0 0 4.76 1.52v-3.4a4.85 4.85 0 0 1-1-.03z" />
                    </svg>
                  </a>
                )}
              </div>
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
                { href: "/blog", label: "Blog" },
                { href: "/search", label: "Search" },
                { href: "/favorites", label: "Saved Recipes" },
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
