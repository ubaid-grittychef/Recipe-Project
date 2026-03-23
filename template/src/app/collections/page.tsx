import type { Metadata } from "next";
import Link from "next/link";
import { getAllRecipes } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { COLLECTIONS } from "@/lib/collections";
import { ChefHat } from "lucide-react";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `Recipe Collections | ${siteConfig.name}`,
  description: `Browse curated recipe collections on ${siteConfig.name}. Quick meals, easy recipes, healthy eating, and more.`,
  metadataBase: new URL(siteConfig.url),
  alternates: { canonical: `${siteConfig.url}/collections` },
};

export default async function CollectionsPage() {
  const recipes = await getAllRecipes();

  const collectionsWithCounts = COLLECTIONS
    .map((collection) => ({
      ...collection,
      count: collection.filter(recipes).length,
    }))
    .filter((c) => c.count > 0);

  return (
    <div className="bg-[#fffdf7] dark:bg-slate-950">

      {/* Page header */}
      <div className="border-b-2 border-slate-900 dark:border-slate-700 bg-[#fffdf7] dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px flex-1 bg-slate-900 dark:bg-slate-700" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Browse</span>
            <div className="h-px flex-1 bg-slate-900 dark:bg-slate-700" />
          </div>
          <div className="text-center">
            <h1
              className="text-4xl font-black text-slate-900 dark:text-slate-100 sm:text-6xl"
              style={{ fontFamily: "var(--font-heading), 'Georgia', serif", letterSpacing: "-0.03em" }}
            >
              Recipe Collections
            </h1>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              {collectionsWithCounts.length > 0
                ? `${collectionsWithCounts.length} curated collections to explore`
                : "Collections will appear as recipes are published"}
            </p>
          </div>
        </div>
      </div>

      {/* Collections grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {collectionsWithCounts.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collectionsWithCounts.map((collection) => (
              <Link
                key={collection.slug}
                href={`/collections/${collection.slug}`}
                className="group flex flex-col rounded-xl border border-[#ede8e0] dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <span className="text-4xl">{collection.emoji}</span>
                <h2
                  className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 transition-colors"
                  style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
                >
                  {collection.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {collection.description}
                </p>
                <div className="mt-4">
                  <span className="inline-flex rounded-full bg-orange-50 dark:bg-orange-950/30 px-3 py-1 text-xs font-semibold text-orange-600">
                    {collection.count} {collection.count === 1 ? "recipe" : "recipes"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-28 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-[#d4cfc7]">
              <ChefHat className="h-9 w-9 text-[#c9bfb0]" />
            </div>
            <h2
              className="text-2xl font-black text-slate-900 dark:text-slate-100"
              style={{ fontFamily: "var(--font-heading), Georgia, serif" }}
            >
              No collections yet
            </h2>
            <p className="mt-2 text-slate-500 text-sm">Collections appear here as recipes are published.</p>
            <Link href="/" className="mt-6 inline-block text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors">
              &larr; Back to home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
