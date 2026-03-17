import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getCategoryEmoji } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Recipe Categories",
  description: `Browse all recipe categories on ${siteConfig.name}. Find copycat recipes by restaurant and cuisine type.`,
  alternates: { canonical: `${siteConfig.url}/categories` },
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="bg-bg min-h-screen">

      {/* ── Masthead ─────────────────────────────────── */}
      <div className="border-b-[3px] border-ink bg-white py-12">
        <div className="max-w-site mx-auto px-6">
          <div className="flex items-center gap-5 mb-6">
            <div className="h-px flex-1 bg-ink" />
            <span className="text-[10px] font-extrabold uppercase tracking-[2.5px] text-ink-3">Explore</span>
            <div className="h-px flex-1 bg-ink" />
          </div>
          <h1 className="font-serif text-[40px] font-black text-ink tracking-[-1px] text-center">
            Recipe Categories
          </h1>
          <p className="text-center text-[15px] text-ink-3 mt-3">
            {categories.length > 0
              ? `${categories.length} ${categories.length === 1 ? "category" : "categories"} — find recipes by cuisine or restaurant`
              : "Browse our growing collection"}
          </p>
        </div>
      </div>

      {/* ── Category grid ───────────────────────────── */}
      <div className="max-w-site mx-auto px-6 py-12">
        {categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-rule">
            {categories.map((cat, i) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className={`relative flex flex-col items-center py-8 px-4 text-center group hover:bg-red-bg transition-colors
                  ${i % 6 !== 5 ? "border-r border-rule" : ""}
                  ${i >= 6 ? "border-t border-rule" : ""}
                `}
              >
                {/* Red sweep underline */}
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-red scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />

                <span className="text-4xl mb-3">{getCategoryEmoji(cat.name)}</span>
                <h2 className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-ink group-hover:text-red transition-colors leading-snug">
                  {cat.name}
                </h2>
                <p className="text-[11px] text-ink-4 mt-1.5">{cat.count} {cat.count === 1 ? "recipe" : "recipes"}</p>

                <span className="mt-3 flex items-center gap-1 text-[10px] font-bold text-red opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-[0.5px]">
                  Browse <ArrowRight className="h-2.5 w-2.5" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-rule py-24 text-center">
            <p className="font-serif text-[28px] font-black text-ink-4 mb-3">No categories yet</p>
            <p className="text-[14px] text-ink-4 mb-6">Categories appear here as recipes are published.</p>
            <Link href="/" className="btn-outline">← Back to Home</Link>
          </div>
        )}
      </div>
    </div>
  );
}
