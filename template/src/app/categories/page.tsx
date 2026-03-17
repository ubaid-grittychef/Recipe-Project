import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getCategoryEmoji, getCategoryGradient } from "@/lib/utils";
import { ChefHat } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Recipe Categories | ${siteConfig.name}`,
  description: `Browse all recipe categories on ${siteConfig.name}. Find copycat recipes by restaurant and cuisine.`,
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: `${siteConfig.url}/categories` },
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="bg-[#fffdf7]">

      {/* ── Page header ─────────────────────────────────── */}
      <div className="border-b-2 border-slate-900 bg-[#fffdf7]">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-900" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Explore</span>
            <div className="h-px flex-1 bg-slate-900" />
          </div>
          <div className="text-center">
            <h1
              className="text-4xl font-black text-slate-900 sm:text-6xl"
              style={{ fontFamily: "var(--font-heading), 'Georgia', serif", letterSpacing: "-0.03em" }}
            >
              Recipe Categories
            </h1>
            <p className="mt-4 text-sm text-slate-500">
              {categories.length > 0
                ? `${categories.length} ${categories.length === 1 ? "category" : "categories"} of copycat recipes`
                : "Browse our growing collection"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Category grid ────────────────────────────────── */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {categories.map((cat) => {
              const gradient = getCategoryGradient(cat.name);
              const emoji = getCategoryEmoji(cat.name);
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="group relative overflow-hidden rounded-xl shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
                  {/* Subtle noise texture */}
                  <div
                    className="absolute inset-0 opacity-[0.05]"
                    style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "18px 18px" }}
                  />
                  <div className="relative flex flex-col items-center px-4 py-8 text-center">
                    <span className="text-4xl drop-shadow-sm transition-transform duration-300 group-hover:scale-110">
                      {emoji}
                    </span>
                    <h2
                      className="mt-3 text-[14px] font-bold leading-snug text-white drop-shadow-sm"
                      style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                    >
                      {cat.name}
                    </h2>
                    <span className="mt-2 rounded-full bg-black/20 px-2.5 py-0.5 text-[11px] font-semibold text-white/90 backdrop-blur-sm">
                      {cat.count} {cat.count === 1 ? "recipe" : "recipes"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="py-28 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#d4cfc7]">
              <ChefHat className="h-9 w-9 text-[#c9bfb0]" />
            </div>
            <h2
              className="text-2xl font-black text-slate-900"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              No categories yet
            </h2>
            <p className="mt-2 text-slate-500 text-sm">Categories appear here as recipes are published.</p>
            <Link href="/" className="mt-6 inline-block text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors">
              ← Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
