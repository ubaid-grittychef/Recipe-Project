import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/data";
import { siteConfig } from "@/lib/config";
import { getCategoryEmoji, getCategoryGradient } from "@/lib/utils";
import { ChefHat } from "lucide-react";

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
  alternates: { canonical: `${siteConfig.url}/categories` },
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Recipe Categories
        </h1>
        <p className="mt-3 max-w-xl mx-auto text-slate-400">
          Browse our collection of copycat recipes organized by restaurant and cuisine.
        </p>
      </div>

      {categories.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => {
            const gradient = getCategoryGradient(cat.name);
            const emoji = getCategoryEmoji(cat.name);
            return (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                className="group relative overflow-hidden rounded-2xl shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/30"
              >
                {/* Gradient background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-80 transition-opacity duration-300 group-hover:opacity-100`} />

                {/* Dark vignette at bottom for text legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Subtle dot pattern */}
                <div className="absolute inset-0 opacity-10"
                  style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "18px 18px" }}
                />

                <div className="relative flex flex-col items-center px-4 py-8 text-center">
                  {/* Large emoji */}
                  <span className="text-5xl drop-shadow transition-transform duration-300 group-hover:scale-110">
                    {emoji}
                  </span>

                  {/* Category name */}
                  <h2 className="mt-4 text-base font-bold leading-tight text-white drop-shadow">
                    {cat.name}
                  </h2>

                  {/* Recipe count pill */}
                  <span className="mt-2 inline-block rounded-full bg-black/30 px-3 py-0.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                    {cat.count} {cat.count === 1 ? "recipe" : "recipes"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 py-20 text-center">
          <ChefHat className="mx-auto h-16 w-16 text-slate-700" />
          <h2 className="mt-4 text-xl font-semibold text-white">No categories yet</h2>
          <p className="mt-2 text-slate-400">Recipe categories will appear here as we add more content.</p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-slate-300 hover:text-white">
            Back to home
          </Link>
        </div>
      )}
    </div>
  );
}
