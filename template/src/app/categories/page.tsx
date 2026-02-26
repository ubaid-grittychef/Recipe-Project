import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getCategoryEmoji } from "@/lib/utils";
import { ChefHat, UtensilsCrossed } from "lucide-react";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Recipe Categories",
  description: `Browse all recipe categories on ${siteConfig.name}. Find copycat recipes by restaurant and cuisine.`,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: `Recipe Categories | ${siteConfig.name}`,
    description: `Browse all recipe categories. Find copycat recipes by restaurant and cuisine.`,
    url: `${siteConfig.url}/categories`,
  },
  alternates: {
    canonical: `${siteConfig.url}/categories`,
  },
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-12 text-center">
        <div
          className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white"
          style={{ backgroundColor: siteConfig.primaryColor }}
        >
          <UtensilsCrossed className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Recipe Categories
        </h1>
        <p className="mt-3 max-w-xl mx-auto text-slate-600">
          Browse our collection of copycat recipes organized by restaurant and
          cuisine.
        </p>
      </div>

      {/* Category grid */}
      {categories.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-6 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
            >
              <span className="mb-3 text-4xl">
                {getCategoryEmoji(cat.name)}
              </span>
              <h2 className="font-semibold text-slate-900 group-hover:text-primary-600">
                {cat.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {cat.count} {cat.count === 1 ? "recipe" : "recipes"}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 py-20 text-center">
          <ChefHat className="mx-auto h-16 w-16 text-slate-200" />
          <h2 className="mt-4 text-xl font-semibold text-slate-900">
            No categories yet
          </h2>
          <p className="mt-2 text-slate-500">
            Recipe categories will appear here as we add more content.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
