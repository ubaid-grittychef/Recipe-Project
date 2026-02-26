import Link from "next/link";
import { siteConfig } from "@/lib/config";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {siteConfig.name}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {siteConfig.tagline}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700">Navigate</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/recipes"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Recipes
                </Link>
              </li>
              <li>
                <Link
                  href="/categories"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Categories
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/sitemap"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-700">Legal</h4>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Terms of Use
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6 text-center">
          <p className="text-xs text-slate-400">
            &copy; {year} {siteConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
